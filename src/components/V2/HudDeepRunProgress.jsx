/**
 * HudDeepRunProgress — V2 sci-fi rendering of a live deep-agent run.
 *
 * Sister of `src/features/ai-chat/presentation/DeepRunProgress.tsx`
 * (V1 styling). Same data source — `useDeepRunProgress(planId, workspaceId)`
 * over the WebSocket realtime layer — wrapped in V2 chamfered panels,
 * monospace text, cyan / amber / red status pills.
 *
 * Drop below an AI message bubble whenever the chat response carries a
 * `plan_id`. The user sees the orchestrator → planner → specialist hops
 * land in real time instead of staring at a spinner.
 *
 * Per CLAUDE V1/V2 rule: V1 components must not import V2 components and
 * vice versa, so this file is the V2 mirror, not a shared variant.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import HexLoader from './HexLoader';
import HudChamferLine from './HudChamferLine';
import { useDeepRunProgress } from '../../features/ai-chat/presentation/useDeepRunProgress';

const PANEL_CLIP =
  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)';

// Mirrors the constants in `src/features/ai-chat/presentation/DeepRunProgress.tsx`.
// Backend contract at `components/agents/application/ports/deep_run_observability_port.py`.
const EVENT_TOOL_LOG = 'tool_log';
const EVENT_TOOL_PROGRESS = 'tool_progress';
const VISIBLE_LOG_LINES = 6;

const statusClasses = (status) => {
  switch (status) {
    case 'completed':
      return 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10';
    case 'running':
      return 'border-cyan-400/40 text-cyan-300 bg-cyan-500/10';
    case 'failed':
      return 'border-red-400/50 text-red-300 bg-red-500/10';
    case 'blocked':
      return 'border-amber-400/40 text-amber-300 bg-amber-500/10';
    case 'pending':
    default:
      return 'border-white/10 text-gray-400 bg-white/[0.02]';
  }
};

const StatusPill = ({ status }) => (
  <span
    className={`inline-block px-2 py-0.5 text-[9px] font-mono tracking-[0.12em] uppercase border ${statusClasses(
      status
    )}`}
  >
    {status}
  </span>
);

const ToolSummary = ({ subagent }) => {
  if (!subagent.tool_calls || subagent.tool_calls.length === 0) return null;
  const counts = subagent.tool_calls.reduce((acc, call) => {
    acc[call.tool_name] = (acc[call.tool_name] || 0) + 1;
    return acc;
  }, {});
  const text = Object.entries(counts)
    .map(([name, n]) => (n > 1 ? `${name}×${n}` : name))
    .join(' · ');
  return (
    <div className="text-[10px] font-mono text-cyan-500/60 pl-1 mt-0.5">
      ◆ {text}
    </div>
  );
};

const SubagentRow = ({ subagent }) => (
  <li
    className="flex flex-col gap-0.5 py-1.5 border-b border-white/[0.04] last:border-b-0"
    data-testid="deep-run-subagent"
  >
    <div className="flex items-center gap-2">
      <StatusPill status={subagent.status} />
      <span className="text-[11px] font-mono text-gray-300">
        {subagent.agent_display_name ||
          subagent.agent_canonical_name ||
          subagent.agent_type ||
          'agent'}
      </span>
      <span className="text-[9px] font-mono text-gray-600 truncate">
        {subagent.task_id}
      </span>
    </div>
    <ToolSummary subagent={subagent} />
  </li>
);

const OverallBar = ({ snapshot, toolPercentOverride }) => {
  // Same priority logic as the V1 component: prefer the latest
  // tool_progress event's progress_percent (mid-tool, finer-grained)
  // when one is in flight; fall back to the snapshot's task-level
  // percent at run boundaries between tool events.
  const displayPercent =
    toolPercentOverride !== null
      ? toolPercentOverride
      : snapshot.progress_percent;
  return (
    <div className="w-full">
      <div className="flex justify-between text-[9px] font-mono text-cyan-500/60 mb-1 tracking-wider">
        <span>
          {snapshot.completed_task_count}/{snapshot.task_count} TASKS
        </span>
        <span>{displayPercent}%</span>
      </div>
      <div className="w-full h-1 bg-white/[0.04] overflow-hidden">
        <div
          className="h-full bg-cyan-400/70 transition-all duration-300"
          style={{ width: `${Math.max(2, displayPercent)}%` }}
          data-testid="deep-run-progress-bar"
        />
      </div>
    </div>
  );
};

const formatLogLine = (event) => {
  // Mirrors V1 formatter:
  //   tool_log → "> [tool_name] message" (or "> ⚠ ..." on warn severity)
  //   tool_progress → "> [tool_name] message (current/total)" — only
  //     when the emit carried a message; numeric-only progress is
  //     covered by the bar.
  const payload = event.payload || {};
  const message =
    typeof payload.message === 'string' ? payload.message.trim() : '';
  const toolName = (event.tool_name || '').trim();
  const prefix = toolName ? `[${toolName}] ` : '';

  if (event.event_type === EVENT_TOOL_LOG) {
    if (!message) return null;
    const severity = payload.severity === 'warn' ? '⚠ ' : '';
    return `> ${severity}${prefix}${message}`;
  }
  if (event.event_type === EVENT_TOOL_PROGRESS) {
    if (!message) return null;
    const counter =
      typeof payload.current === 'number' &&
      typeof payload.total === 'number' &&
      payload.total > 0
        ? ` (${Math.round(payload.current)}/${Math.round(payload.total)})`
        : '';
    return `> ${prefix}${message}${counter}`;
  }
  return null;
};

const formatDetailLine = (event) => {
  const tool = event.tool_name ? `[${event.tool_name}] ` : '';
  const agent = event.agent_type ? `${event.agent_type} ` : '';
  const payload = event.payload || {};
  const message = typeof payload.message === 'string' ? payload.message : '';
  return `> ${agent}${tool}${event.event_type}${message ? `: ${message}` : ''}`;
};

const ConsoleLog = ({ events, expanded, onToggle }) => {
  const visibleLines = useMemo(() => {
    const formatted = [];
    for (const event of events) {
      const line = formatLogLine(event);
      if (line) formatted.push(line);
    }
    return formatted.slice(-VISIBLE_LOG_LINES);
  }, [events]);

  const detailLines = useMemo(() => events.map(formatDetailLine), [events]);

  const scrollSentinelRef = useRef(null);
  useEffect(() => {
    const sentinel = scrollSentinelRef.current;
    if (sentinel && typeof sentinel.scrollIntoView === 'function') {
      sentinel.scrollIntoView({ block: 'end' });
    }
  }, [visibleLines.length]);

  if (visibleLines.length === 0 && !expanded) return null;

  return (
    <div className="space-y-1.5" data-testid="deep-run-console">
      {visibleLines.length > 0 && (
        <div
          className="relative bg-black/60 border border-cyan-500/[0.08] px-2.5 py-1.5 font-mono text-[10px] leading-relaxed text-cyan-200 max-h-32 overflow-hidden"
          data-testid="deep-run-console-visible"
          style={{ clipPath: PANEL_CLIP }}
        >
          <HudChamferLine color="rgba(46,219,232,0.3)" />
          {visibleLines.map((line, index) => (
            <div key={`${index}-${line}`} className="whitespace-pre-wrap">
              {line}
            </div>
          ))}
          <div ref={scrollSentinelRef} />
        </div>
      )}
      {detailLines.length > 0 && (
        <button
          type="button"
          onClick={onToggle}
          className="text-[9px] font-mono text-cyan-400/70 hover:text-cyan-300 tracking-wider uppercase"
          data-testid="deep-run-console-toggle"
        >
          {expanded
            ? '▼ HIDE DETAILS'
            : `▶ SHOW DETAILS (${detailLines.length})`}
        </button>
      )}
      {expanded && (
        <div
          className="relative bg-black/80 border border-cyan-500/[0.06] px-2.5 py-1.5 font-mono text-[10px] leading-relaxed text-cyan-300/80 max-h-72 overflow-y-auto"
          data-testid="deep-run-console-detail"
          style={{ clipPath: PANEL_CLIP }}
        >
          <HudChamferLine color="rgba(46,219,232,0.25)" />
          {detailLines.map((line, index) => (
            <div key={`${index}-detail`} className="whitespace-pre-wrap">
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const latestToolProgressPercent = (events) => {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event.event_type !== EVENT_TOOL_PROGRESS) continue;
    const payload = event.payload || {};
    const percent = payload.progress_percent;
    if (typeof percent === 'number' && percent >= 0 && percent <= 100) {
      return percent;
    }
  }
  return null;
};

const HudDeepRunProgress = ({ planId, workspaceId, compact = false }) => {
  const { snapshot, events, isLoading, error } = useDeepRunProgress(
    planId,
    workspaceId
  );
  const [detailExpanded, setDetailExpanded] = useState(false);

  const toolPercentOverride = useMemo(
    () => latestToolProgressPercent(events),
    [events]
  );

  if (!planId) return null;

  if (error) {
    return (
      <div
        className="relative text-[10px] font-mono text-red-300 bg-red-500/10 border border-red-400/40 px-2 py-1"
        role="alert"
        style={{ clipPath: PANEL_CLIP }}
      >
        <HudChamferLine color="rgba(248,113,113,0.5)" />
        PROGRESS UNAVAILABLE — {error}
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1"
        data-testid="deep-run-loading"
      >
        <HexLoader size={28} speed={1.4} />
        <span className="text-[10px] font-mono text-cyan-500/60 tracking-wider">
          {isLoading ? 'CONNECTING TO RUN…' : 'WAITING FOR RUN TO START…'}
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative bg-black/40 backdrop-blur-sm border border-cyan-500/[0.12] p-2.5 space-y-2"
      data-testid="deep-run-progress"
      style={{ clipPath: PANEL_CLIP }}
    >
      <HudChamferLine color="rgba(46,219,232,0.4)" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusPill status={snapshot.status} />
          <span className="text-[10px] font-mono text-gray-300 tracking-wider">
            {/* HUD is a stylized terminal panel — keep the all-caps
                treatment for the slug fallback but show the registered
                display name verbatim when present (already title-cased
                like "Writing Agent"). */}
            {snapshot.agent_display_name ||
              snapshot.agent_canonical_name?.toUpperCase() ||
              snapshot.agent_type?.toUpperCase() ||
              'DEEP AGENT'}
          </span>
        </div>
        <span className="text-[9px] font-mono text-cyan-500/40">
          {snapshot.plan_id.slice(0, 8)}
        </span>
      </div>

      <OverallBar
        snapshot={snapshot}
        toolPercentOverride={toolPercentOverride}
      />

      <ConsoleLog
        events={events}
        expanded={detailExpanded}
        onToggle={() => setDetailExpanded((current) => !current)}
      />

      {!compact && snapshot.subagents.length > 0 && (
        <ul className="list-none m-0 p-0">
          {snapshot.subagents.map((subagent) => (
            <SubagentRow key={subagent.task_id} subagent={subagent} />
          ))}
        </ul>
      )}

      {snapshot.last_error && (
        <div
          className="relative text-[10px] font-mono text-red-300 bg-red-500/10 border border-red-400/30 px-2 py-1"
          style={{ clipPath: PANEL_CLIP }}
        >
          <HudChamferLine color="rgba(248,113,113,0.45)" />
          {snapshot.last_error}
        </div>
      )}
    </div>
  );
};

export default HudDeepRunProgress;
