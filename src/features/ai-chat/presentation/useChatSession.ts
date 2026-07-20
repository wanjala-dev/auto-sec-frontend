/**
 * useChatSession — shared chat logic hook for V1 and V2.
 *
 * Extracted from SproutChatWindow to allow both V1 (rounded bubbles,
 * circular avatars) and V2 (chamfered bubbles, hex/pentagon avatars)
 * to render independently while sharing the same business logic.
 *
 * Owns: messages, threads, loading states, send handler, thread
 * switching, PDF uploads, agent execution, streaming, suggestions.
 *
 * Does NOT own: any UI rendering or styling decisions.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getAgentMemoryHistory } from '../../../application/agents/agentsService';
import {
  clearAiAgentMemory,
  deleteConversationById,
  renameConversation as renameConversationApi
} from '../../../application/aiChat/aiChatService';
import { useSeedContext } from '../../seed/presentation/SeedContext';
import { useAiChatContext } from './AiChatContext';
import { useAgentContext } from '../../agents/presentation/AgentContext';
import { useAiTeammateAlias } from '../../../hooks/useAiTeammateAlias';
import { useViewerSession } from '../../auth/presentation/useViewerSession';
import {
  decrementActiveWorkspaceAIQuotaUsed,
  markActiveWorkspaceAIQuotaDailyExhausted,
  markActiveWorkspaceAIQuotaMonthlyTokensExhausted
} from '../../workspace/presentation/useActiveWorkspaceAIQuota';

const NEW_THREAD_VALUE = '__new__';

export default function useChatSession(agentContext: any) {
  // ── Context consumption ──
  const { seed } = (useSeedContext as any)?.() || { seed: null };
  const { storedActiveSeedId } = useViewerSession();
  const { alias: assistantAlias } = useAiTeammateAlias(seed?.id || seed?.pk);
  const { executeAgent } = (useAgentContext as any)?.() || {};
  const isAgentChat = Boolean(agentContext?.agentId);
  const agentLabel =
    agentContext?.label ||
    agentContext?.name ||
    agentContext?.title ||
    assistantAlias;
  const assistantDisplayName = isAgentChat ? agentLabel : assistantAlias;

  // ── Welcome message factories ──
  const createWelcomeMessage = useCallback(() => {
    return {
      sender: 'ai',
      text: `Hi! I am ${assistantAlias}, your AI assistant. You can ask me about your donations, seeds, teams, or anything else!`,
      timestamp: new Date().toLocaleTimeString(),
      isWelcome: true
    };
  }, [assistantAlias]);

  const createAgentWelcomeMessage = useCallback(() => {
    const summary = agentContext?.summary || agentContext?.description || '';
    const capabilities = Array.isArray(agentContext?.capabilities)
      ? agentContext.capabilities
      : [];
    const examples = Array.isArray(agentContext?.examples)
      ? agentContext.examples
      : [];
    const lines = [
      `You're chatting with ${agentLabel}.`,
      summary,
      capabilities.length ? `Capabilities: ${capabilities.join(', ')}.` : '',
      examples.length ? `Try asking: ${examples.join(' • ')}` : ''
    ].filter(Boolean);

    return {
      sender: 'ai',
      text: lines.join('\n\n'),
      timestamp: new Date().toLocaleTimeString(),
      isWelcome: true,
      isAgent: true
    };
  }, [agentContext, agentLabel]);

  // ── Core state ──
  const [messages, setMessages] = useState<any[]>(() => [
    createWelcomeMessage()
  ]);
  const [loading, setLoading] = useState(false);
  const [inlineSuggestions, setInlineSuggestions] = useState<string[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [agentConversationId, setAgentConversationId] = useState<string | null>(
    null
  );
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  const [activePdfConversationId, setActivePdfConversationId] = useState<
    string | null
  >(null);
  // A PDF the user picked in the composer that we START uploading + indexing
  // immediately (before they hit send), so they see progress instead of
  // wondering if anything happened (Henry 2026-07-15).
  // status: uploading | indexing | ready | failed
  const [pendingPdf, setPendingPdf] = useState<{
    name: string;
    fileId: any;
    status: string;
  } | null>(null);
  const pendingPdfRef = useRef(pendingPdf);
  pendingPdfRef.current = pendingPdf;
  // When the chat is opened scoped to an entity (e.g. a template) the opener
  // passes ``agentContext.assistContext`` — a grounding blurb we prepend to
  // the FIRST backend query so the assistant knows what it's discussing. Sent
  // once per opened context; the backend conversation then carries it forward.
  const assistContextSentRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── AI Chat context ──
  const {
    askSeedQuestion,
    askSeedQuestionStream,
    createConversation,
    conversationId,
    history,
    getConversationsBySeed,
    getConversationDetail,
    conversations,
    uploadPdfFile,
    pollPdfProcessingStatus,
    createPdfConversation,
    sendPdfConversationMessage,
    dispatch: aiChatDispatch
  } = (useAiChatContext as any)?.() || {
    askSeedQuestion: null,
    askSeedQuestionStream: null,
    createConversation: null,
    conversationId: null,
    history: [],
    getConversationsBySeed: null,
    getConversationDetail: null,
    conversations: [],
    uploadPdfFile: null,
    pollPdfProcessingStatus: null,
    createPdfConversation: null,
    sendPdfConversationMessage: null,
    dispatch: null
  };

  // ── Thread state ──
  const [threads, setThreads] = useState<any[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Welcome message reset ──
  useEffect(() => {
    if (isAgentChat) return;
    setMessages((prev) => {
      if (!prev.length) return [createWelcomeMessage()];
      if (prev.length === 1 && prev[0]?.isWelcome)
        return [createWelcomeMessage()];
      return prev;
    });
  }, [createWelcomeMessage, isAgentChat]);

  useEffect(() => {
    if (!isAgentChat) return;
    setMessages([createAgentWelcomeMessage()]);
    setInlineSuggestions(agentContext?.examples || []);
    setActiveSuggestion(null);
    setAgentConversationId(agentContext?.conversationId || null);
  }, [agentContext, createAgentWelcomeMessage, isAgentChat]);

  // Surface ``agentContext.examples`` as suggestion pills even outside
  // agent-chat mode. Workspace-chat entry points (PdfSummaryButton,
  // AskAiButton) dispatch ``ai-chat-open`` with pre-canned prompts
  // ("Summarize in 5 bullets", "Tighten this draft", etc.) and expect
  // them to show up as one-tap pills above the composer — same UX as
  // the screenshot user feedback (mid-session 2026-06-12). Without
  // this effect those examples would only land when ``agentId`` is
  // also passed, which we deliberately dropped to avoid backend 404s.
  useEffect(() => {
    // A new scoped context (new template/entity) must re-send its grounding
    // blurb on the next message.
    assistContextSentRef.current = false;
    if (isAgentChat) return;
    if (Array.isArray((agentContext as any)?.examples)) {
      setInlineSuggestions((agentContext as any).examples);
      setActiveSuggestion(null);
    }
  }, [agentContext, isAgentChat]);

  // ── PDF context auto-bootstrap ──
  //
  // When the chat panel opens with an `agentContext.pdfId` (e.g. the
  // "Summarize this PDF" affordance in the library dispatches an
  // ai-chat-open event with the file id baked in), we shortcut the
  // upload flow and create the server-side PDF conversation directly so
  // the first user prompt routes through the PDF chat path. Without
  // this, the suggestion pills ("Summarize in 5 bullets") would fire
  // against the generic workspace chat and the AI wouldn't know which
  // PDF to read.
  useEffect(() => {
    const pdfId = (agentContext as any)?.pdfId;
    if (!pdfId) return;
    if (activePdfConversationId) return;
    if (!createPdfConversation) return;
    const seedId = (agentContext as any)?.seedId || seed?.id || seed?.pk;
    if (!seedId) return;
    const title =
      (agentContext as any)?.pdfName?.replace(/\.pdf$/i, '').trim() ||
      'PDF Summary';
    let cancelled = false;
    (async () => {
      try {
        const created = await createPdfConversation(pdfId, seedId, title);
        if (cancelled) return;
        if (created?.id) {
          setActivePdfConversationId(created.id);
        }
      } catch (err: any) {
        // Bootstrap failure surfaces via toast on first message attempt
        // — keeping silent here avoids two toasts for one root cause.
        console.error('Failed to bootstrap PDF conversation', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    agentContext,
    activePdfConversationId,
    createPdfConversation,
    seed?.id,
    seed?.pk
  ]);

  // ── Utilities ──
  const [loadedConvosSeed, setLoadedConvosSeed] = useState<string | null>(null);

  const mapApiMessagesToUi = useCallback((apiMessages: any[] = []) => {
    return apiMessages.map((m: any) => {
      const role = m.role || m.type || m.sender || '';
      const text = m.content || m.message || m.text || '';
      const when = m.created_at || m.timestamp || new Date().toISOString();
      // Pull downloadable artifacts off the server-side message metadata.
      // The agent-side artifact collector (PR-H1) writes a list of
      // ``{kind, id, title, download_url, mime_type, status}`` dicts
      // into ``metadata.artifacts`` whenever a tool produced a PDF or
      // file the user can download. Lift to a top-level field so the
      // bubble renders the paperclip without digging into metadata.
      const rawArtifacts =
        (m && m.metadata && Array.isArray(m.metadata.artifacts)
          ? m.metadata.artifacts
          : null) ||
        (Array.isArray(m?.artifacts) ? m.artifacts : null) ||
        [];
      // RAG chunks the planner used to ground this answer. Backend
      // writes them to ``ConversationMessage.metadata.sources`` (AI
      // Fluency Wave 2 — citations panel). Same shape as the
      // backend's ``_prefetch_retrieved_context``:
      // ``{section, section_title, content, score}``. Empty array
      // when the answer ran without RAG grounding.
      const rawSources =
        (m && m.metadata && Array.isArray(m.metadata.sources)
          ? m.metadata.sources
          : null) ||
        (Array.isArray(m?.sources) ? m.sources : null) ||
        [];
      return {
        // Preserve the server-side ConversationMessage UUID so
        // <FeedbackButtons /> can attach thumbs-up/down to it via
        // POST /ai/conversations/<conv>/messages/<id>/feedback/.
        id: m.id || m.message_id || undefined,
        sender: role === 'human' || role === 'user' ? 'user' : 'ai',
        text,
        timestamp: new Date(when).toLocaleTimeString(),
        isWelcome: false,
        // Aggregate thumbs-up/down counts across all users, and the
        // current user's vote (if any) — consumed by
        // <FeedbackButtons />.
        feedbackCounts: m.feedback_counts || { up: 0, down: 0 },
        myFeedback: m.my_feedback || null,
        artifacts: rawArtifacts,
        sources: rawSources
      };
    });
  }, []);

  const getConvoId = useCallback(
    (c: any) => c?.id || c?.pk || c?.conversation_id || c?.uuid || c?.uid,
    []
  );

  // ── Load conversation ──
  const handleLoadConversation = useCallback(
    async (id: string) => {
      const detail = await getConversationDetail?.(id);
      if (detail?.messages) {
        const uiMsgs = mapApiMessagesToUi(detail.messages);
        setMessages(uiMsgs.length ? uiMsgs : [createWelcomeMessage()]);
        setInlineSuggestions([]);
      }
    },
    [createWelcomeMessage, getConversationDetail, mapApiMessagesToUi]
  );

  // ── Agent memory history ──
  const fetchAgentMemoryHistory = useCallback(
    async (agentId: string, options: any = {}) => {
      if (!agentId) return { history: [] as any[], conversationId: null };
      const { limit = 50, order = 'asc' } = options;
      const historyItems: any[] = [];
      let offset = 0;
      let hasMore = true;
      let convoId: string | null = null;

      while (hasMore) {
        const params: any = { order };
        if (Number.isFinite(limit)) params.limit = limit;
        if (offset) params.offset = offset;

        const data = await getAgentMemoryHistory(agentId, params);

        const batch = Array.isArray(data?.conversation_history)
          ? data.conversation_history
          : Array.isArray(data?.messages)
          ? data.messages
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];

        if (!convoId) {
          const found = batch.find((item: any) => item?.conversation_id);
          convoId = found?.conversation_id || null;
        }

        historyItems.push(...batch);

        const pagination =
          data?.pagination || data?.conversation_pagination || null;
        if (!pagination || typeof pagination?.has_more !== 'boolean') {
          hasMore = false;
          break;
        }
        if (!pagination.has_more || batch.length === 0) {
          hasMore = false;
          break;
        }

        const nextOffset = Number.isFinite(pagination?.next_offset)
          ? pagination.next_offset
          : offset + (pagination?.returned ?? batch.length);
        if (!Number.isFinite(nextOffset) || nextOffset === offset) {
          hasMore = false;
          break;
        }
        offset = nextOffset;
      }

      return { history: historyItems, conversationId: convoId };
    },
    []
  );

  // ── Agent history loading effect ──
  useEffect(() => {
    if (!isAgentChat || !agentContext?.agentId) return;
    let cancelled = false;
    (async () => {
      try {
        setHistoryLoading(true);
        const { history: hist, conversationId: cid } =
          await fetchAgentMemoryHistory(agentContext.agentId, {
            limit: 50,
            order: 'asc'
          });
        if (cancelled) return;
        const uiMessages = mapApiMessagesToUi(hist);
        setMessages(
          uiMessages.length ? uiMessages : [createAgentWelcomeMessage()]
        );
        setInlineSuggestions(agentContext?.examples || []);
        if (cid || agentContext?.conversationId) {
          setAgentConversationId(cid || agentContext.conversationId);
        }
      } catch (_) {
        if (cancelled) return;
        setMessages([createAgentWelcomeMessage()]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    agentContext?.agentId,
    agentContext?.conversationId,
    agentContext?.examples,
    createAgentWelcomeMessage,
    fetchAgentMemoryHistory,
    isAgentChat,
    mapApiMessagesToUi
  ]);

  // ── Thread list loader ──
  const loadThreadList = useCallback(
    async (workspaceId: string) => {
      if (!workspaceId || !getConversationsBySeed) return [];
      setThreadsLoading(true);
      try {
        const list = await getConversationsBySeed(workspaceId);
        const items = Array.isArray(list) ? list : [];
        setThreads(items);
        return items;
      } catch (_) {
        setThreads([]);
        return [];
      } finally {
        setThreadsLoading(false);
      }
    },
    [getConversationsBySeed]
  );

  const threadPdfId = useCallback((thread: any) => {
    if (!thread) return null;
    return thread.pdf_id ?? thread.metadata?.pdf_id ?? null;
  }, []);

  // ── Auto-restore conversation on mount ──
  useEffect(() => {
    const activeSeedId = seed?.id || seed?.pk || storedActiveSeedId;
    if (
      activeSeedId &&
      activeSeedId !== loadedConvosSeed &&
      getConversationsBySeed
    ) {
      setLoadedConvosSeed(activeSeedId);
      setHistoryLoading(true);
      let cancelled = false;
      // Safety: even if the fetch hangs past 20s, drop the skeleton so
      // the user isn't stuck on it forever.  The real result still
      // wins if it arrives later.
      const safetyTimer = setTimeout(() => {
        setHistoryLoading(false);
      }, 20000);
      (async () => {
        try {
          // The caller may hand us an explicit conversation id (e.g.
          // deep-linked into a specific past chat); otherwise fall
          // through to the most-recent thread so opening the chat
          // widget from the floating button lands the user back on
          // their last conversation.  We intentionally do NOT filter
          // by ``agentContext.agentId`` — Agent DB rows can be
          // recreated (different runtime id even for the same
          // user+workspace+type), which would hide the user's real
          // history behind a filter mismatch.
          const explicitId = agentContext?.conversationId;
          const items = await loadThreadList(activeSeedId);
          if (cancelled) return;
          let target: any = null;
          if (explicitId) {
            target =
              items.find((t: any) => getConvoId(t) === explicitId) || null;
          }
          if (!target) target = items[0] || null;
          if (target) {
            const targetId = getConvoId(target);
            const pdfId = threadPdfId(target);
            setActivePdfConversationId(pdfId || null);
            if (targetId) {
              await handleLoadConversation(targetId);
              return;
            }
          }
          setActivePdfConversationId(null);
          setMessages([
            isAgentChat ? createAgentWelcomeMessage() : createWelcomeMessage()
          ]);
        } catch (_) {
          if (!cancelled) {
            setActivePdfConversationId(null);
            setMessages([
              isAgentChat ? createAgentWelcomeMessage() : createWelcomeMessage()
            ]);
          }
        } finally {
          clearTimeout(safetyTimer);
          setHistoryLoading(false);
        }
      })();
      return () => {
        cancelled = true;
        clearTimeout(safetyTimer);
      };
    }
  }, [
    agentContext?.conversationId,
    createAgentWelcomeMessage,
    createWelcomeMessage,
    getConversationsBySeed,
    getConvoId,
    handleLoadConversation,
    loadThreadList,
    loadedConvosSeed,
    isAgentChat,
    seed,
    storedActiveSeedId,
    threadPdfId
  ]);

  // ── Refresh thread list on new conversation ──
  useEffect(() => {
    if (isAgentChat) return;
    const activeSeedId = seed?.id || seed?.pk || storedActiveSeedId;
    if (!activeSeedId) return;
    if (!conversationId) return;
    loadThreadList(activeSeedId);
  }, [conversationId, isAgentChat, loadThreadList, seed, storedActiveSeedId]);

  // ── Message utilities ──
  const appendMessage = useCallback((message: any) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const replaceMessage = useCallback((messageId: string, updates: any) => {
    if (!messageId) return;
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, ...updates } : message
      )
    );
  }, []);

  // ── Upload-on-select ──
  // Start uploading + indexing a picked PDF right away so the composer shows
  // progress before the user sends. handleSend then reuses the already-
  // uploaded file instead of uploading on send (Henry 2026-07-15).
  const onFilesSelected = useCallback(
    async (selected: any[]) => {
      const pdf = (selected || []).find(
        (f: any) =>
          f?.type === 'application/pdf' ||
          f?.name?.toLowerCase().endsWith('.pdf')
      );
      if (!pdf) return;
      const seedId = seed?.id || seed?.pk;
      if (!seedId || !uploadPdfFile) return;

      setPendingPdf({ name: pdf.name, fileId: null, status: 'uploading' });
      try {
        const info = await uploadPdfFile(pdf, seedId);
        const fileId = info?.file_id || info?.id;
        if (!fileId) {
          setPendingPdf({ name: pdf.name, fileId: null, status: 'failed' });
          return;
        }
        setPendingPdf({ name: pdf.name, fileId, status: 'indexing' });
        if (pollPdfProcessingStatus) {
          const status = await pollPdfProcessingStatus(fileId);
          const failed = status?.processing_status === 'failed';
          setPendingPdf((prev) =>
            prev && prev.fileId === fileId
              ? { ...prev, status: failed ? 'failed' : 'ready' }
              : prev
          );
        } else {
          setPendingPdf((prev) =>
            prev && prev.fileId === fileId ? { ...prev, status: 'ready' } : prev
          );
        }
      } catch {
        setPendingPdf((prev) => (prev ? { ...prev, status: 'failed' } : prev));
      }
    },
    [seed, uploadPdfFile, pollPdfProcessingStatus]
  );

  const clearPendingPdf = useCallback(() => setPendingPdf(null), []);

  // ── Send handler ──
  const handleSend = useCallback(
    async ({ text, files, images }: any) => {
      const trimmed = text?.trim() || '';
      const attachmentFiles = Array.isArray(files) ? files : [];
      const pdfFiles = attachmentFiles.filter(
        (file: any) =>
          file?.type === 'application/pdf' ||
          file?.name?.toLowerCase().endsWith('.pdf')
      );
      const unsupported = attachmentFiles.filter(
        (file: any) => file && !pdfFiles.includes(file)
      );

      if (
        !trimmed &&
        pdfFiles.length === 0 &&
        (!images || images.length === 0)
      ) {
        return;
      }

      // ── Agent chat path ──
      if (isAgentChat && trimmed) {
        const timestamp = new Date().toLocaleTimeString();
        appendMessage({
          id: `agent-user-${Date.now()}`,
          sender: 'user',
          text: trimmed,
          timestamp
        });
        setLoading(true);
        setInlineSuggestions([]);

        const placeholderId = `agent-placeholder-${Date.now()}`;
        appendMessage({
          id: placeholderId,
          sender: 'ai',
          text: 'Agent received your request and is working on it…',
          timestamp,
          isAgent: true,
          status: 'queued'
        });

        try {
          if (!executeAgent || !agentContext?.agentId) {
            throw new Error('Agent execution is not available.');
          }
          const result = await executeAgent(agentContext.agentId, trimmed, {
            conversationId: agentConversationId,
            seedId: agentContext?.seedId || seed?.id || seed?.pk
          });
          const completedAt = new Date().toLocaleTimeString();
          const plainString = typeof result === 'string' ? result : null;
          const resolvedText =
            result?.result?.message ||
            result?.result?.response ||
            result?.result?.output ||
            result?.result ||
            result?.summary ||
            result?.detail ||
            result?.message ||
            plainString ||
            `Agent executed successfully: "${trimmed}"`;

          const resolvedConversationId =
            result?.conversation_id ||
            result?.state?.conversation_id ||
            result?.conversation?.id ||
            result?.conversationId ||
            null;
          if (resolvedConversationId) {
            setAgentConversationId(resolvedConversationId);
          }

          replaceMessage(placeholderId, {
            text: resolvedText,
            timestamp: completedAt,
            status: result?.status || 'completed',
            isAgent: true
          });
        } catch (error: any) {
          replaceMessage(placeholderId, {
            text:
              error?.response?.data?.detail ||
              error?.message ||
              'Agent execution failed. Please try again.',
            isError: true
          });
        } finally {
          setLoading(false);
        }
        return;
      }

      if (unsupported.length > 0) {
        toast.warn('Only PDF uploads are supported right now.');
      }

      // Include the stored active workspace — on surfaces with no seed
      // route (the Command Center), SeedContext is empty and a bare
      // ``seed?.id`` left ``msg.workspaceId`` undefined, so
      // ``useResourceStream`` silently never subscribed and the run
      // progress stayed at "WAITING FOR RUN TO START…" forever even
      // after the answer arrived. Same fallback as the thread-list
      // effects above.
      const seedId = seed?.id || seed?.pk || storedActiveSeedId;

      // ── PDF upload path ──
      if (pdfFiles.length > 0) {
        if (!seedId) {
          toast.error('Select a seed before uploading a PDF.');
          return;
        }
        if (!uploadPdfFile || !createPdfConversation) {
          toast.error('PDF conversations are not available right now.');
          return;
        }

        const targetFile = pdfFiles[0];
        if (pdfFiles.length > 1) {
          toast.info(
            'Processing the first PDF only. Upload additional PDFs one at a time.'
          );
        }

        setLoading(true);
        setInlineSuggestions([]);
        try {
          // Reuse the file already uploaded on select (Henry 2026-07-15) —
          // don't re-upload the same PDF. Fall back to uploading now for
          // hosts that don't wire onFilesSelected.
          const preloaded = pendingPdfRef.current;
          let fileId: any;
          if (
            preloaded?.fileId &&
            preloaded.name === targetFile.name &&
            preloaded.status !== 'failed'
          ) {
            fileId = preloaded.fileId;
            if (preloaded.status !== 'ready' && pollPdfProcessingStatus) {
              const status = await pollPdfProcessingStatus(fileId);
              if (status?.processing_status === 'failed') {
                toast.error('PDF processing failed. Please try again.');
                setPendingPdf(null);
                return;
              }
            }
          } else {
            const uploadInfo = await uploadPdfFile(targetFile, seedId);
            if (!uploadInfo) return;
            fileId = uploadInfo.file_id || uploadInfo.id;
            if (pollPdfProcessingStatus && fileId) {
              const status = await pollPdfProcessingStatus(fileId);
              if (status?.processing_status === 'failed') {
                toast.error('PDF processing failed. Please try again.');
                return;
              }
            }
          }

          const title =
            (targetFile.name || 'PDF Conversation')
              .replace(/\.pdf$/i, '')
              .trim() || 'PDF Conversation';
          const created = await createPdfConversation(fileId, seedId, title);
          if (!created?.id) return;

          setActivePdfConversationId(created.id);
          setPendingPdf(null);

          if (trimmed) {
            setMessages((msgs) => [
              ...msgs,
              {
                sender: 'user',
                text: trimmed,
                timestamp: new Date().toLocaleTimeString(),
                isWelcome: false
              }
            ]);
            const reply = await sendPdfConversationMessage?.(
              created.id,
              trimmed
            );
            const replyText =
              reply?.response || reply?.content || reply?.message || '';
            if (replyText) {
              setMessages((msgs) => [
                ...msgs,
                {
                  sender: 'ai',
                  text: replyText,
                  timestamp: new Date().toLocaleTimeString(),
                  isWelcome: false
                }
              ]);
            }
          }

          toast.success(
            `PDF "${title}" is ready. Keep chatting — your messages will be saved.`
          );
        } catch (error: any) {
          const errText =
            error?.response?.data?.message ||
            error?.message ||
            'Unable to create a PDF conversation right now.';
          toast.error(errText);
        } finally {
          setLoading(false);
        }
        return;
      }

      if (!trimmed) return;

      // ── Standard text message ──
      const userMessage = {
        sender: 'user',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString(),
        isWelcome: false
      };
      setMessages((msgs) => [...msgs, userMessage]);
      setLoading(true);
      setInlineSuggestions([]);

      // Ground the FIRST message on the opener's scoped context (e.g. the
      // template the user clicked "AI assist" on). The UI bubble shows the
      // user's own text; only the backend query carries the context prefix.
      let queryForBackend = trimmed;
      const assistContext = (agentContext as any)?.assistContext;
      if (assistContext && !assistContextSentRef.current) {
        queryForBackend = `Context you are grounded on:\n${assistContext}\n\nUser question: ${trimmed}`;
        assistContextSentRef.current = true;
      }

      // ── Workspace + PDF chat path (unified through the Deep Agent) ──
      //
      // Previously PDF chat branched here to ``sendPdfConversationMessage``
      // (the legacy ``/ai/conversations/<id>/messages/create/`` endpoint),
      // which bypassed the Deep Agent entirely — no plan_id, no
      // <DeepRunProgress />, no answer-skeleton, no RAG sources panel.
      // Post Deep Agent Unification (aiChatApi.ts:19-24) the workspace
      // chat path *is* the agent-chat path, and it already accepts
      // ``conversation_id``. The backend's ``agent_chat_use_case`` reads
      // ``Conversation.metadata.pdf_id`` (set at bootstrap by
      // ``createPdfConversation``) and scopes RAG retrieval to that
      // single PDF — so passing ``activePdfConversationId`` as the
      // conversation id here is enough to get a PDF-scoped Deep Agent
      // answer with the full progress UI.
      //
      //
      // Why we generate ``planId`` *before* the request:
      //
      // ``<DeepRunProgress />`` opens a WebSocket on
      // ``resource.agent_run.<planId>`` and renders the live
      // tool-call card from the events the orchestrator emits via
      // ``ctx.info()`` / ``ctx.report_progress()``. If we wait for
      // ``result.plan_id`` to come back at the end of the request,
      // the run is already over by the time DeepRunProgress mounts
      // and the user has been staring at "Thinking..." for the whole
      // duration. Generating the UUID up front and shipping it in the
      // request body lets the backend pick it up as the deep-run
      // thread id, so by the time the orchestrator publishes its
      // first event, the WS subscriber is already listening.
      const planId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `plan-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const ts = new Date().toLocaleTimeString();

      // Empty AI placeholder, but with planId + workspaceId already
      // wired so ``<DeepRunProgress />`` mounts on the same render
      // pass that adds the bubble. The text fills in as the LLM
      // resolves.
      setMessages((msgs) => [
        ...msgs,
        {
          sender: 'ai',
          text: '',
          timestamp: ts,
          isWelcome: false,
          planId,
          workspaceId: seedId
        }
      ]);

      // PDF chat conversations are bootstrapped via
      // ``createPdfConversation`` (POST ``/ai/memories/conversations/create/``
      // with ``{pdf_id, workspace_id, title}``) and stored locally as
      // ``activePdfConversationId``. The Deep Agent endpoint reads the
      // pdf_id off the conversation's metadata to scope retrieval — but
      // only if we tell it which conversation we're on. Prefer the PDF
      // conversation id over ``state.conversationId`` when one is set so
      // the user's first message lands on the bootstrapped PDF thread
      // instead of accidentally spawning a fresh workspace conversation.
      const conversationIdForRequest =
        activePdfConversationId || conversationId;

      try {
        if (askSeedQuestionStream) {
          let accumulated = '';
          const result = await askSeedQuestionStream(
            queryForBackend,
            seedId,
            { conversationId: conversationIdForRequest, planId },
            {
              onStart: () => {
                setLoading(false);
              },
              onToken: (chunk: string) => {
                accumulated += chunk;
                setMessages((msgs) => {
                  if (!msgs.length) return msgs;
                  const copy = [...msgs];
                  const lastIndex = copy.length - 1;
                  if (copy[lastIndex]?.sender === 'ai') {
                    copy[lastIndex] = {
                      ...copy[lastIndex],
                      text: accumulated
                    };
                  }
                  return copy;
                });
              }
            }
          );
          if (result?.suggestions?.length) {
            setInlineSuggestions(result.suggestions);
          }
          // Attach RAG sources from the streaming response onto the
          // assistant bubble so the citations panel renders without
          // waiting for a conversation reload to pick up
          // ``ConversationMessage.metadata.sources``. Empty array
          // when the answer ran without RAG grounding.
          if (Array.isArray(result?.sources) && result.sources.length) {
            setMessages((msgs) => {
              if (!msgs.length) return msgs;
              const copy = [...msgs];
              const lastIndex = copy.length - 1;
              if (copy[lastIndex]?.sender === 'ai') {
                copy[lastIndex] = {
                  ...copy[lastIndex],
                  sources: result.sources
                };
              }
              return copy;
            });
          }
          // Optimistically decrement the cached workspace quota so the
          // chat-header pill repaints without waiting for the next
          // me/summary refetch. Failure-safe and a no-op on unlimited
          // workspaces. The backend remains the source of truth — the
          // next me/summary fetch overwrites any drift.
          decrementActiveWorkspaceAIQuotaUsed();
        } else if (askSeedQuestion) {
          const {
            reply: replyText,
            suggestions,
            sources,
            conversation_id
          } = await askSeedQuestion(queryForBackend, seedId, {
            conversationId: conversationIdForRequest,
            planId
          });
          setMessages((msgs) => {
            if (!msgs.length) return msgs;
            const copy = [...msgs];
            const lastIndex = copy.length - 1;
            if (copy[lastIndex]?.sender === 'ai') {
              copy[lastIndex] = {
                ...copy[lastIndex],
                text: replyText || 'I could not parse a reply.',
                timestamp: new Date().toLocaleTimeString(),
                sources: Array.isArray(sources) ? sources : []
              };
            }
            return copy;
          });
          if (suggestions?.length) {
            setInlineSuggestions(suggestions);
          }
          // Optimistic quota decrement (same shape as the streaming
          // branch above).
          decrementActiveWorkspaceAIQuotaUsed();
        } else {
          // No chat service wired — fill the placeholder we already
          // appended (don't append a second AI bubble).
          setMessages((msgs) => {
            if (!msgs.length) return msgs;
            const copy = [...msgs];
            const lastIndex = copy.length - 1;
            if (copy[lastIndex]?.sender === 'ai') {
              copy[lastIndex] = {
                ...copy[lastIndex],
                text: 'AI chat is not available right now.'
              };
            }
            return copy;
          });
        }
      } catch (error: any) {
        // Workspace AI chat quota exceeded (PR #5 / #254): the backend
        // returns 429 with a `quota` body explaining which cap fired
        // (daily messages vs monthly tokens). Surface that exact text
        // inline so the user knows what to do — they shouldn't see
        // the generic "could not process" string when the real story
        // is "your workspace already used 100 chats today".
        const status = error?.response?.status;
        const data = error?.response?.data;
        let errText: string;
        if (status === 429 && data?.quota) {
          errText =
            data.error ||
            'This workspace has hit its AI chat limit. Resets at midnight UTC.';
          // Repaint the chat-header pill immediately by patching the
          // cached me/summary. The next natural refetch corrects any
          // drift; until then the user sees the right state.
          const decision = data.quota.decision || '';
          if (decision.includes('monthly_token_limit')) {
            markActiveWorkspaceAIQuotaMonthlyTokensExhausted();
          } else {
            markActiveWorkspaceAIQuotaDailyExhausted();
          }
        } else {
          errText =
            data?.message ||
            data?.error ||
            error?.message ||
            'Sorry, I could not process that request.';
        }
        // Replace the placeholder bubble's text with the error so the
        // user sees the failure inline instead of a phantom blank
        // bubble plus a separate error bubble below it.
        setMessages((msgs) => {
          if (!msgs.length) return msgs;
          const copy = [...msgs];
          const lastIndex = copy.length - 1;
          if (copy[lastIndex]?.sender === 'ai') {
            copy[lastIndex] = {
              ...copy[lastIndex],
              text: errText,
              isError: true
            };
          }
          return copy;
        });
      } finally {
        setLoading(false);
      }
    },
    [
      activePdfConversationId,
      agentContext,
      agentConversationId,
      appendMessage,
      askSeedQuestion,
      askSeedQuestionStream,
      conversationId,
      createPdfConversation,
      executeAgent,
      isAgentChat,
      pollPdfProcessingStatus,
      replaceMessage,
      seed,
      sendPdfConversationMessage,
      storedActiveSeedId,
      uploadPdfFile
    ]
  );

  // ── Computed values ──
  const hasStreamingPlaceholder = useMemo(() => {
    return messages.some(
      (msg: any) =>
        msg.sender === 'ai' && !(msg.text || '').trim() && !msg.isWelcome
    );
  }, [messages]);

  const threadOptions = useMemo(() => {
    const formatLabel = (raw: string) => {
      const text = (raw || '').trim();
      if (!text) return 'Untitled';
      return text.length > 24 ? `${text.slice(0, 22)}…` : text;
    };
    const formatCaption = (iso: string) => {
      if (!iso) return undefined;
      try {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const day = 24 * 60 * 60 * 1000;
        if (diffMs < day) {
          return d.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        if (diffMs < 7 * day) {
          return d.toLocaleDateString([], { weekday: 'short' });
        }
        return d.toLocaleDateString();
      } catch (_) {
        return undefined;
      }
    };
    const items = threads.map((t: any) => ({
      value: getConvoId(t),
      label: formatLabel(t?.title),
      rawLabel: (t?.title || '').trim(),
      caption: formatCaption(t?.updated_at || t?.created_at)
    }));
    return [
      {
        value: NEW_THREAD_VALUE,
        label: '+ New chat',
        renameable: false
      },
      ...items.filter((it: any) => it.value)
    ];
  }, [threads, getConvoId]);

  const handleSelectThread = useCallback(
    async (threadId: string) => {
      if (threadId === NEW_THREAD_VALUE) {
        if (typeof aiChatDispatch === 'function') {
          aiChatDispatch({
            type: 'AI_CHAT_SET_CONVERSATION',
            payload: null
          });
          aiChatDispatch({
            type: 'AI_CHAT_SET_CONVERSATION_MESSAGES',
            payload: []
          });
        }
        setActivePdfConversationId(null);
        setMessages([createWelcomeMessage()]);
        setInlineSuggestions([]);
        return;
      }
      if (!threadId || threadId === conversationId) return;
      const target = threads.find((t: any) => getConvoId(t) === threadId);
      setActivePdfConversationId(target ? threadPdfId(target) || null : null);
      await handleLoadConversation(threadId);
    },
    [
      aiChatDispatch,
      conversationId,
      createWelcomeMessage,
      getConvoId,
      handleLoadConversation,
      threadPdfId,
      threads
    ]
  );

  const suggestionOptions = useMemo(() => {
    if (!inlineSuggestions?.length) return [];
    return inlineSuggestions.map((suggestion) => ({
      label: suggestion,
      value: suggestion
    }));
  }, [inlineSuggestions]);

  // ── Clear-chat handler ──
  // Resets the chat to a clean state so the agent no longer re-reads
  // prior messages as context.  Useful when a past turn produced
  // errors that now pollute the buffer memory, or when the user just
  // wants to start a fresh thread.
  //
  // Steps:
  //   1. Delete the current conversation server-side (if any) — drops
  //      stored messages so they don't leak back into the LLM prompt.
  //   2. Clear the in-process agent memory (best-effort; skipped if we
  //      don't have an agent id handy).
  //   3. Reset the local chat state and conversation id so the next
  //      send opens a brand new conversation.
  const handleClearChat = useCallback(async () => {
    const currentConversationId = conversationId;
    const agentId = agentContext?.agentId || null;
    const activeSeedId = seed?.id || seed?.pk || storedActiveSeedId;

    // 1. Delete conversation server-side (silent on failure — we still
    // want to clear local state).
    if (currentConversationId) {
      try {
        await deleteConversationById(currentConversationId);
      } catch (err) {
        // non-fatal — UI still resets
      }
    }

    // 2. Clear the agent's in-process memory (optional).
    if (agentId) {
      try {
        await clearAiAgentMemory(agentId);
      } catch (err) {
        // non-fatal
      }
    }

    // 3. Refresh the thread list so the deleted conversation's title
    // disappears from the thread switcher pills.  If we don't do
    // this the pill stays visible and a user clicking it just
    // re-selects a now-missing conversation.
    if (activeSeedId) {
      try {
        await loadThreadList(activeSeedId);
      } catch (err) {
        // non-fatal
      }
    }

    // 4. Reset local state — mirrors the "+ New chat" path.
    if (typeof aiChatDispatch === 'function') {
      aiChatDispatch({
        type: 'AI_CHAT_SET_CONVERSATION',
        payload: null
      });
      aiChatDispatch({
        type: 'AI_CHAT_SET_CONVERSATION_MESSAGES',
        payload: []
      });
    }
    setActivePdfConversationId(null);
    setMessages([createWelcomeMessage()]);
    setInlineSuggestions([]);

    toast.success('Chat cleared — starting a fresh thread.');
  }, [
    aiChatDispatch,
    agentContext,
    conversationId,
    createWelcomeMessage,
    loadThreadList,
    seed,
    storedActiveSeedId
  ]);

  // ── Rename-thread handler ──
  // Sends a PATCH to the server and refreshes the local thread list
  // so the pill reflects the new title immediately.  Fails silently
  // if the server rejects; the toast surfaces the reason.
  const handleRenameThread = useCallback(
    async (threadId: string, newTitle: string) => {
      const title = (newTitle || '').trim();
      if (!threadId || !title) return;
      const activeSeedId = seed?.id || seed?.pk || storedActiveSeedId;
      try {
        await renameConversationApi(threadId, title);
        if (activeSeedId) {
          await loadThreadList(activeSeedId);
        }
      } catch (err: any) {
        toast.error(
          err?.response?.data?.error || err?.message || 'Could not rename chat.'
        );
      }
    },
    [loadThreadList, seed, storedActiveSeedId]
  );

  // ── Public API ──
  return {
    // State
    messages,
    loading,
    historyLoading,
    threadsLoading,
    inlineSuggestions,
    activeSuggestion,
    threads,
    conversationId,

    // Computed
    isAgentChat,
    assistantDisplayName,
    assistantAlias,
    hasStreamingPlaceholder,
    threadOptions,
    suggestionOptions,
    // Resolved workspace id from the seed context — exposed so chat
    // surfaces (V1 SproutChatWindow, V2 HudChatPanel) can pass it
    // straight into the MissionContextChip without re-reading the
    // seed context themselves. Falls back to ``agentContext.seedId``
    // for the dedicated-agent chat route which uses an explicit id.
    workspaceId:
      (agentContext?.seedId as any) ??
      (seed?.id as any) ??
      (seed?.pk as any) ??
      null,

    // Handlers
    handleSend,
    onFilesSelected,
    pendingPdf,
    clearPendingPdf,
    handleSelectThread,
    handleClearChat,
    handleRenameThread,
    setActiveSuggestion,

    // Refs
    messagesEndRef,

    // Constants
    NEW_THREAD_VALUE
  };
}
