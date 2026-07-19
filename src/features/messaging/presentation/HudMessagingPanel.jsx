import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiSend, FiPlus, FiSearch, FiMessageSquare } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HudCard from '../../../components/V2/HudCard';
import HudButton from '../../../components/V2/HudButton';
import HudText from '../../../components/V2/HudText';
import HudInput from '../../../components/V2/HudInput';
import HexLoader from '../../../components/V2/HexLoader';
import RestrictedArea from '../../../components/V2/RestrictedArea';
import { messagingService } from '../../../application/messaging/messagingService';
import { useSeedContext } from '../../seed/presentation/SeedContext';
import { readViewerStoredUser } from '../../auth/presentation/browserAuthSessionSupport';
import { normalizeStoredUserId } from '../../../domain/auth/storedUserSelectors';

const initials = (name, email) => {
  const src = (name || email || '?').trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  const two = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return (two || src[0] || '?').toUpperCase();
};

// messagingService normalizes each conversation to { title, lastMessageText,
// unreadCount, initials, otherParticipantId }.
const convName = (c) => c?.title || c?.subject || 'Operator';

/**
 * HudMessagingPanel — operator-to-operator direct messages as HUD panel content
 * (single-screen: floats over the command center). Conversation rail + thread +
 * composer, backed by the ported messaging context via messagingService.
 */
export default function HudMessagingPanel() {
  const { seed } = useSeedContext();
  const workspaceId = seed?.id || seed?.pk || undefined;
  const meId = normalizeStoredUserId(readViewerStoredUser());

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // New-conversation search
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const threadEndRef = useRef(null);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      setConversations(await messagingService.fetchConversations());
    } catch {
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const openConversation = useCallback(async (id) => {
    setActiveId(id);
    setComposing(false);
    setLoadingThread(true);
    try {
      setMessages(await messagingService.fetchMessages(id));
      await messagingService.markRead(id);
    } catch {
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || !activeId) return;
    setSending(true);
    setDraft('');
    try {
      const msg = await messagingService.sendMessage(activeId, body);
      if (msg) setMessages((prev) => [...prev, msg]);
      loadConversations();
    } catch {
      toast.error('Unable to send message', { icon: '⚠️' });
    } finally {
      setSending(false);
    }
  }, [draft, activeId, loadConversations]);

  const runSearch = useCallback(
    async (q) => {
      setQuery(q);
      if (!q.trim()) {
        setResults([]);
        return;
      }
      try {
        setResults(await messagingService.searchUsers(q.trim(), workspaceId));
      } catch {
        setResults([]);
      }
    },
    [workspaceId]
  );

  const startWith = useCallback(
    async (user) => {
      try {
        const convo = await messagingService.startConversation(
          user.id,
          workspaceId
        );
        setComposing(false);
        setQuery('');
        setResults([]);
        await loadConversations();
        if (convo?.id) openConversation(convo.id);
      } catch {
        toast.error('Unable to start conversation', { icon: '⚠️' });
      }
    },
    [workspaceId, loadConversations, openConversation]
  );

  return (
    <div className="flex h-[62vh] w-full gap-3">
      {/* ── Conversation rail ── */}
      <div className="flex w-[240px] flex-shrink-0 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <HudText variant="label" color="cyan-muted">
            MESSAGES
          </HudText>
          <button
            type="button"
            onClick={() => setComposing((v) => !v)}
            title="New message"
            className="flex items-center gap-1 border border-hud-line/25 px-1.5 py-0.5 font-mono text-[9px] text-hud-accent transition hover:border-hud-accent/50 hover:text-cyan-200"
          >
            <FiPlus size={10} /> NEW
          </button>
        </div>

        {composing && (
          <div className="mb-2">
            <HudInput
              icon={<FiSearch size={12} />}
              placeholder="Search operators…"
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              className="px-2 py-1"
            />
            <div className="mt-1 max-h-40 overflow-y-auto cc-scrollbar">
              {results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => startWith(u)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition hover:bg-cyan-500/[0.06]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-hud-line/30 bg-hud-surface-2 font-mono text-[8px] font-bold text-hud-accent">
                    {initials(u.name, u.email)}
                  </span>
                  <span className="truncate font-mono text-[10px] text-hud-text">
                    {u.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto cc-scrollbar">
          {loadingList ? (
            <div className="flex justify-center py-6">
              <HexLoader size={40} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-2 py-4">
              <span className="font-mono text-[9px] text-hud-dim">
                — NO CONVERSATIONS —
              </span>
            </div>
          ) : (
            conversations.map((c) => {
              const name = convName(c);
              const unread = c.unreadCount || 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openConversation(c.id)}
                  className={`flex w-full items-center gap-2 border-l-2 px-2 py-2 text-left transition ${
                    String(activeId) === String(c.id)
                      ? 'border-hud-accent bg-cyan-500/[0.06]'
                      : 'border-transparent hover:bg-cyan-500/[0.03]'
                  }`}
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-hud-line/30 bg-hud-surface-2 font-mono text-[9px] font-bold text-hud-accent">
                    {c.initials || initials(name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[11px] text-hud-text">
                      {name}
                    </span>
                    <span className="block truncate font-mono text-[9px] text-hud-dim">
                      {c.lastMessageText || '—'}
                    </span>
                  </span>
                  {unread > 0 && (
                    <span className="flex-shrink-0 rounded-full bg-cyan-500 px-1.5 font-mono text-[8px] font-bold text-[#04121f]">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Thread ── */}
      <HudCard
        chamfer={14}
        border="cyan"
        surface="bg-hud-surface/70 backdrop-blur-sm"
        bodyClassName="flex h-full flex-col p-0"
        className="min-w-0 flex-1"
      >
        {!activeId ? (
          <div className="flex h-full items-center justify-center p-6">
            <RestrictedArea
              variant="info"
              title="DIRECT MESSAGES"
              subtitle="SELECT A CONVERSATION"
              message="Pick a conversation or start a new one with an operator."
            />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto cc-scrollbar p-3">
              {loadingThread ? (
                <div className="flex justify-center py-8">
                  <HexLoader size={44} />
                </div>
              ) : (
                messages.map((m) => {
                  const mine = String(m.senderId) === String(meId);
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] border px-3 py-1.5 font-mono text-[11px] ${
                          mine
                            ? 'border-hud-accent/40 bg-cyan-500/[0.08] text-cyan-100'
                            : 'border-hud-line/15 bg-hud-surface text-hud-text'
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={threadEndRef} />
            </div>
            <div className="flex items-end gap-2 border-t border-hud-line/10 p-2">
              <div className="flex-1">
                <HudInput
                  icon={<FiMessageSquare size={13} />}
                  placeholder="Message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  className="px-2 py-1"
                />
              </div>
              <HudButton
                variant="primary"
                icon={<FiSend size={12} />}
                disabled={sending || !draft.trim()}
                onClick={send}
              >
                Send
              </HudButton>
            </div>
          </>
        )}
      </HudCard>
    </div>
  );
}
