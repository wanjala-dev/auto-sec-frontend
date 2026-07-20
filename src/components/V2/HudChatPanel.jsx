/**
 * HudChatPanel — V2 chat UI using useChatSession.
 *
 * Native V2 rendering: chamfered bubbles, hexagon AI avatar,
 * pentagon user avatar, sharp-edge filter pills, monospace font.
 * No ChatComposer — the Command Center's "Ask Auto-Sec anything"
 * bar handles input and calls handleSend via the chat prop.
 */

import React from 'react';
import { FiChevronDown } from 'react-icons/fi';
import HexEyeLogo from './HexEyeLogo';
import HudButton from './HudButton';
import Loading2 from '../Utility/LoadingSpinner/Loading';
import HudDeepRunProgress from './HudDeepRunProgress';
import MissionContextChipV2 from './MissionContextChip';
import SourcesPanelV2 from './SourcesPanel';

const HEX_CLIP = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';
const PENT_CLIP = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
const BUBBLE_CLIP =
  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)';
const PILL_CLIP =
  'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))';

export default function HudChatPanel({ isOpen, onClose, chat }) {
  if (!chat) return null;

  const {
    messages,
    loading,
    historyLoading,
    inlineSuggestions,
    activeSuggestion,
    conversationId,
    isAgentChat,
    assistantDisplayName,
    hasStreamingPlaceholder,
    threadOptions,
    suggestionOptions,
    workspaceId,
    handleSend,
    handleSelectThread,
    handleClearChat,
    setActiveSuggestion,
    messagesEndRef,
    NEW_THREAD_VALUE
  } = chat;

  const hasClearableState =
    Boolean(conversationId) ||
    (Array.isArray(messages) && messages.some((m) => m && m.sender === 'user'));

  return (
    <div
      className="overflow-hidden bg-hud-surface/95 backdrop-blur-xl border-t border-hud-line/[0.08] flex flex-col"
      style={{
        maxHeight: isOpen ? '70vh' : '0px',
        opacity: isOpen ? 1 : 0,
        transition:
          'max-height 400ms cubic-bezier(0.25,0.1,0.25,1), opacity 350ms ease'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-cyan-500/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 flex items-center justify-center bg-cyan-500/10"
            style={{ clipPath: HEX_CLIP }}
          >
            <HexEyeLogo className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-mono font-semibold text-cyan-500/50 tracking-[0.12em]">
            AUTO-SEC AI
          </span>
          {/* Mission-context chip — silent until the workspace owner
              authors an AI profile, then shows the active fields on
              hover. Click navigates to the settings tab. */}
          {workspaceId && (
            <MissionContextChipV2
              workspaceId={String(workspaceId)}
              settingsRoute={`/settings/${workspaceId}?tab=ai_profile`}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-600 hover:text-white transition"
        >
          <FiChevronDown size={14} />
        </button>
      </div>

      {/* Thread pills */}
      {!isAgentChat && threadOptions.length > 1 && (
        <div className="flex-shrink-0 border-b border-cyan-500/[0.06] px-3 pt-2 pb-2 flex gap-1 overflow-x-auto">
          {threadOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelectThread(opt.value)}
              className={`flex-shrink-0 px-3 py-1 text-[9px] font-mono tracking-wider transition border ${
                (conversationId || NEW_THREAD_VALUE) === opt.value
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                  : 'border-transparent text-gray-600 hover:text-gray-400'
              }`}
              style={{ clipPath: PILL_CLIP }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {historyLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loading2
              message="Loading conversation..."
              overlay={false}
              size={0.5}
            />
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`flex ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            } items-start gap-2`}
          >
            {msg.sender === 'user' ? (
              <React.Fragment>
                <div
                  className="px-3 py-2 max-w-[75%] text-[12px] font-mono bg-cyan-500/[0.08] text-gray-300 border border-cyan-500/10"
                  style={{ clipPath: BUBBLE_CLIP }}
                >
                  <span className="whitespace-pre-line">{msg.text}</span>
                </div>
                <div
                  className="w-8 h-8 flex items-center justify-center bg-cyan-500/15 text-cyan-400 text-[10px] font-mono font-bold flex-shrink-0"
                  style={{ clipPath: PENT_CLIP }}
                >
                  U
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div
                  className="w-8 h-8 flex items-center justify-center bg-cyan-500/10 flex-shrink-0"
                  style={{ clipPath: HEX_CLIP }}
                >
                  <HexEyeLogo className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-2 max-w-[75%]">
                  {/* Skip the text bubble while HudDeepRunProgress is the
                      active indicator — the live tool-call card replaces
                      "Thinking..." rather than sitting under it. */}
                  {(msg.text && msg.text.trim().length) || !msg.planId ? (
                    <div
                      className="px-3 py-2 text-[12px] font-mono bg-purple-500/[0.06] text-gray-300 border border-purple-500/[0.08]"
                      style={{ clipPath: BUBBLE_CLIP }}
                    >
                      <span className="whitespace-pre-line">
                        {msg.text && msg.text.trim().length
                          ? msg.text
                          : `Thinking...`}
                      </span>
                    </div>
                  ) : null}
                  {msg.planId && (
                    <HudDeepRunProgress
                      planId={msg.planId}
                      workspaceId={msg.workspaceId}
                    />
                  )}
                  {msg.text && msg.text.trim().length > 0 && (
                    <SourcesPanelV2 sources={msg.sources} />
                  )}
                </div>
              </React.Fragment>
            )}
          </div>
        ))}
        {loading && !hasStreamingPlaceholder && (
          <div className="flex justify-start items-start gap-2">
            <div
              className="w-8 h-8 flex items-center justify-center bg-cyan-500/10 flex-shrink-0"
              style={{ clipPath: HEX_CLIP }}
            >
              <HexEyeLogo className="w-4 h-4" />
            </div>
            <div className="px-3 py-2 text-[12px] font-mono bg-purple-500/[0.06] text-gray-500 border border-purple-500/[0.08] animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        {hasClearableState &&
          typeof handleClearChat === 'function' &&
          !loading && (
            <div className="flex justify-center pt-2">
              <HudButton
                variant="ghost"
                onClick={handleClearChat}
                className="!px-4 !py-1 !text-[9px]"
                title="Clear this chat and start a fresh thread"
                aria-label="Clear chat"
              >
                CLEAR CHAT
              </HudButton>
            </div>
          )}
        <div ref={messagesEndRef} />
      </div>

      {/* Inline suggestions */}
      {inlineSuggestions?.length > 0 && (
        <div className="px-4 pb-2 border-t border-cyan-500/[0.06]">
          <div className="text-[9px] font-mono text-cyan-500/40 mb-2 pt-2 tracking-wider">
            SUGGESTIONS
          </div>
          <div className="flex gap-1 flex-wrap">
            {suggestionOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setActiveSuggestion(opt.value);
                  handleSend({ text: opt.value });
                }}
                className={`px-3 py-1 text-[9px] font-mono border transition ${
                  activeSuggestion === opt.value
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                    : 'border-white/[0.04] text-gray-600 hover:text-cyan-400'
                }`}
                style={{ clipPath: PILL_CLIP }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
