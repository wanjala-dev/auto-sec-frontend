import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { isRateLimited } from '../../../infrastructure/http/apiClient';
import {
  askWorkspaceQuestion,
  clearAiAgentMemory,
  createSeedMemoryConversation,
  deleteConversationById,
  getConversationById,
  getSeedConversationMessages,
  listSeedConversations
} from '../../../application/aiChat/aiChatService';
import { resolveStoredActiveSeedId } from '../../../domain/auth/storedUserSelectors';
import { readViewerSessionSnapshot } from '../../../features/auth/presentation/useViewerSession';
import { readBrowserSearch } from '../../../features/navigation/presentation/browserNavigationSupport';

export const useAiChatConversationPresentation = ({
  dispatch,
  state,
  actions,
  seed,
  seeds
}: {
  dispatch: any;
  state: any;
  actions: any;
  seed: any;
  seeds: any[];
}) => {
  const resolveSeedId = useCallback(
    (explicit) => {
      if (explicit) return explicit;
      const ctxId = seed?.id || seed?.pk;
      if (ctxId) return ctxId;
      if (Array.isArray(seeds) && seeds.length > 0) {
        const first = seeds[0];
        const firstId = first?.id || first?.pk || first?.seed_id;
        if (firstId) return firstId;
      }
      try {
        const params = new URLSearchParams(readBrowserSearch());
        const qpSeed =
          params.get('workspace_id') ||
          params.get('workspace') ||
          params.get('seed_id') ||
          params.get('seed');
        if (qpSeed) return qpSeed;
      } catch (_) {}
      const { storedUser: user } = readViewerSessionSnapshot();
      const storedSeedId = resolveStoredActiveSeedId(user);
      if (storedSeedId) return storedSeedId;
      return null;
    },
    [seed, seeds]
  );

  const normalizeQuery = useCallback((query) => {
    if (!query || typeof query !== 'string') return query;
    const raw = query.trim();
    const normalized = raw.toLowerCase();

    if (
      normalized === 'list my seed' ||
      normalized === 'list my seeds' ||
      normalized === 'list seeds' ||
      normalized === 'list seed' ||
      normalized === 'show seeds' ||
      normalized === 'show my seed' ||
      normalized === 'what seeds do i have' ||
      normalized === 'what are my seeds'
    ) {
      return 'Show my seeds';
    }

    if (
      normalized === 'top donor' ||
      normalized === 'who is my top donor' ||
      normalized === 'who is my top donor?'
    ) {
      return 'Who is my top donor?';
    }

    if (
      normalized === 'top 5 donations' ||
      normalized === 'show top 5 donations' ||
      normalized === 'top five donations'
    ) {
      return 'Top 5 donations';
    }

    if (
      normalized === 'income vs expense' ||
      normalized === 'income vs expenses' ||
      normalized === 'compare income and expenses' ||
      normalized === 'income versus expense'
    ) {
      return 'Income vs expense this month';
    }

    if (
      normalized === 'top spend this week' ||
      normalized === 'which category this week did we spend most money' ||
      normalized === 'which category this week did we spend most money?' ||
      normalized === 'which category did we spend the most this week'
    ) {
      return 'Which category this week did we spend most money?';
    }

    return raw;
  }, []);

  const createConversation = useCallback(
    async (seedId, title = 'Seed Chat') => {
      const resolvedSeedId = resolveSeedId(seedId);
      if (!resolvedSeedId) {
        toast.error('Please select a seed to start a conversation');
        return null;
      }
      try {
        const conversation = await createSeedMemoryConversation(
          resolvedSeedId,
          title
        );
        const conversationId = conversation?.id;
        if (conversationId) {
          dispatch({
            type: actions.AI_CHAT_SET_CONVERSATION,
            payload: conversationId
          });
        }
        return conversationId;
      } catch (error) {
        if (!isRateLimited()) {
          toast.error(
            error?.response?.data?.message || 'Failed to create conversation',
            { toastId: 'conversation-create-error' }
          );
        }
        return null;
      }
    },
    [actions.AI_CHAT_SET_CONVERSATION, dispatch, resolveSeedId]
  );

  const getConversationsBySeed = useCallback(
    async (seedId) => {
      const resolvedSeedId = resolveSeedId(seedId);
      if (!resolvedSeedId) return [];
      dispatch({ type: actions.AI_CHAT_CONVERSATIONS_LOADING });
      try {
        const list = await listSeedConversations(resolvedSeedId);
        dispatch({
          type: actions.AI_CHAT_SET_CONVERSATIONS,
          payload: list
        });
        return list;
      } catch (error) {
        dispatch({
          type: actions.AI_CHAT_CONVERSATIONS_ERROR,
          payload: error.message
        });
        if (!isRateLimited()) {
          toast.error(
            error?.response?.data?.message || 'Failed to load conversations',
            { toastId: 'conversations-load-error' }
          );
        }
        return [];
      }
    },
    [
      actions.AI_CHAT_CONVERSATIONS_ERROR,
      actions.AI_CHAT_CONVERSATIONS_LOADING,
      actions.AI_CHAT_SET_CONVERSATIONS,
      dispatch,
      resolveSeedId
    ]
  );

  const getConversationDetail = useCallback(
    async (conversationId, seedId) => {
      if (!conversationId) return null;
      const resolvedSeedId = resolveSeedId(seedId);
      try {
        const messages = await getSeedConversationMessages(
          conversationId,
          resolvedSeedId
        );
        dispatch({
          type: actions.AI_CHAT_SET_CONVERSATION,
          payload: conversationId
        });
        dispatch({
          type: actions.AI_CHAT_SET_CONVERSATION_MESSAGES,
          payload: messages
        });
        return { meta: null, messages };
      } catch (error) {
        toast.error(
          error?.response?.data?.message || 'Failed to load conversation'
        );
        return null;
      }
    },
    [
      actions.AI_CHAT_SET_CONVERSATION,
      actions.AI_CHAT_SET_CONVERSATION_MESSAGES,
      dispatch,
      resolveSeedId
    ]
  );

  const askSeedQuestion = useCallback(
    async (
      question,
      seedId,
      options: { conversationId?: string; k?: number; planId?: string } = {}
    ) => {
      if (!question || typeof question !== 'string') {
        return {
          reply: '',
          suggestions: [],
          conversation_id: state.conversationId
        };
      }
      const resolvedSeedId = resolveSeedId(seedId);
      if (!resolvedSeedId) {
        toast.error('Seed is required to chat. Please select a seed.');
        return {
          reply: '',
          suggestions: [],
          conversation_id: state.conversationId
        };
      }

      const {
        conversationId: overrideConversationId,
        k = 20,
        planId: clientPlanId
      } = options;
      const conversationIdForPayload =
        overrideConversationId || state.conversationId || undefined;

      dispatch({ type: actions.AI_CHAT_LOADING });

      try {
        // The chat UI generates ``planId`` *before* this call so it
        // can open the WS subscription to ``agent_run/<planId>``
        // before the orchestrator starts. We forward it verbatim;
        // the backend uses it as the deep-run thread id and emits
        // ``ctx.info()`` / ``ctx.report_progress()`` events to the
        // matching group, where ``<DeepRunProgress />`` is already
        // listening.
        const payload: Record<string, unknown> = {
          query: normalizeQuery(question),
          workspace_id: resolvedSeedId,
          k,
          conversation_id: conversationIdForPayload
        };
        if (clientPlanId) {
          payload.plan_id = clientPlanId;
        }
        const data = await askWorkspaceQuestion(payload);
        const reply =
          data?.response ||
          data?.reply ||
          data?.answer ||
          data?.message ||
          (typeof data === 'string' ? data : '');
        const errorMessage = data?.error || data?.detail || '';
        const hasError = Boolean(errorMessage);
        const finalReply = (reply || errorMessage || '').trim();
        const suggestions = Array.isArray(data?.suggestions)
          ? data.suggestions
          : [];
        const returnedConversationId =
          data?.conversation_id || conversationIdForPayload;
        // Deep Agent Unification: /ai/chat/agent-chat/ always returns a
        // plan_id on success. The chat page can pass it to
        // <DeepRunProgress planId={planId} /> to render the live
        // progress bar, sub-agent tree, and tool-call counters.
        const returnedPlanId = data?.plan_id || null;

        if (
          returnedConversationId &&
          returnedConversationId !== state.conversationId
        ) {
          dispatch({
            type: actions.AI_CHAT_SET_CONVERSATION,
            payload: returnedConversationId
          });
        }

        dispatch({ type: actions.AI_CHAT_ADD_HISTORY, payload: question });
        dispatch({
          type: actions.AI_CHAT_SET_REPLY,
          payload: finalReply || ''
        });
        dispatch({ type: actions.AI_CHAT_SUCCESS });

        return {
          reply: finalReply || '',
          suggestions,
          conversation_id: returnedConversationId,
          plan_id: returnedPlanId,
          isError: hasError
        };
      } catch (error) {
        dispatch({
          type: actions.AI_CHAT_ERROR,
          payload: error?.message || 'Error'
        });

        const serverMessage =
          error?.response?.data?.response ||
          error?.response?.data?.reply ||
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.response?.data?.detail ||
          (error?.message?.includes('Network')
            ? 'Unknown Error - check your network connection'
            : '') ||
          'Server Error!';

        if (error?.response === undefined) {
          toast.error('Unknown Error - check your network connection');
        } else if (
          error?.response?.status === 500 ||
          error?.response?.status === 404
        ) {
          toast.error('Server Error!');
        } else {
          toast.error(serverMessage);
        }

        const erroredConversationId =
          error?.response?.data?.conversation_id || state.conversationId;
        return {
          reply: serverMessage,
          suggestions: [],
          conversation_id: erroredConversationId,
          isError: true
        };
      }
    },
    [
      actions.AI_CHAT_ADD_HISTORY,
      actions.AI_CHAT_ERROR,
      actions.AI_CHAT_LOADING,
      actions.AI_CHAT_SET_CONVERSATION,
      actions.AI_CHAT_SET_REPLY,
      actions.AI_CHAT_SUCCESS,
      dispatch,
      normalizeQuery,
      resolveSeedId,
      state.conversationId
    ]
  );

  const askSeedQuestionStream = useCallback(
    async (
      question,
      seedId,
      options = {},
      streamOptions: {
        onToken?: (chunk: string) => void;
        onStart?: () => void;
        // chunkSize/delayMs were used by an earlier client-side fake-stream
        // simulation; ignored now that the backend is the source of truth.
        chunkSize?: number;
        delayMs?: number;
      } = {}
    ) => {
      // Honest streaming: the backend resolves the full reply in a single
      // request (Phase 7.5). We expose the streaming-shaped callback so call
      // sites (HudChatPanel, SproutChatWindow) keep their incremental-render
      // wiring; when Phase 7.6 lands real token streaming, this function is
      // the single point that swaps to a chunked transport. Pretending to
      // stream by slicing the already-arrived response with setTimeout was
      // misleading — wall-clock latency was identical and the token-by-token
      // animation implied the LLM was still working.
      const { onToken, onStart } = streamOptions;
      const result = await askSeedQuestion(question, seedId, options);
      const full = result?.reply || '';
      try {
        if (typeof onStart === 'function') onStart();
      } catch (_) {}
      if (onToken && full) {
        try {
          onToken(full);
        } catch (_) {}
      }
      return result;
    },
    [askSeedQuestion]
  );

  const deleteConversation = useCallback(
    async (conversationId) => {
      try {
        try {
          await getConversationById(conversationId);
        } catch (ownershipError) {
          if (ownershipError.response?.status === 404) {
            try {
              const allConversations = await listSeedConversations(
                resolveSeedId(null),
                {}
              );
              const matchingConversation = allConversations.find(
                (conversation) =>
                  conversation.conversation_id === conversationId ||
                  conversation.id === conversationId
              );

              if (matchingConversation && matchingConversation.agent_id) {
                await clearAiAgentMemory(matchingConversation.agent_id);
                toast.success('Agent conversation cleared successfully');
                return true;
              }

              toast.error(
                "Conversation not found or you don't have permission to delete it. " +
                  'If this is an agent conversation, delete the agent instead.'
              );
              return false;
            } catch (listError) {
              console.error('Error checking conversation list:', listError);
              toast.error('Failed to verify conversation ownership');
              return false;
            }
          }

          toast.error(
            "You don't have permission to delete this conversation. " +
              'If this is an agent conversation, delete the agent instead.'
          );
          return false;
        }

        await deleteConversationById(conversationId);
        toast.success('Conversation deleted successfully');
        return true;
      } catch (error) {
        console.error('Error deleting conversation:', error);
        if (error.response?.status === 403) {
          toast.error(
            "You don't have permission to delete this conversation. " +
              'If this is an agent conversation, delete the agent instead.'
          );
        } else {
          toast.error('Failed to delete conversation');
        }
        return false;
      }
    },
    [resolveSeedId]
  );

  const clearAgentMemory = useCallback(async (agentId) => {
    try {
      await clearAiAgentMemory(agentId);
      toast.success('Agent memory cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing agent memory:', error);
      toast.error('Failed to clear agent memory');
      return false;
    }
  }, []);

  return {
    resolveSeedId,
    createConversation,
    getConversationsBySeed,
    getConversationDetail,
    askSeedQuestion,
    askSeedQuestionStream,
    deleteConversation,
    clearAgentMemory
  };
};
