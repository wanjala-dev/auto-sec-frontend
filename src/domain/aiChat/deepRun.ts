/**
 * Deep-run observability types — backend contract for
 * GET /ai/agents/runs/<plan_id>/, /events/, and /stats/.
 *
 * See docs/frontend-handoffs/UNIFIED_AGENT_CHAT_HANDOFF.md in the API repo
 * for the full contract.
 */

export type DeepRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export type DeepRunSubagentStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'unknown';

export interface DeepRunToolCall {
  tool_name: string;
  agent_type: string;
  status: string;
  timestamp: string;
}

export interface DeepRunSubagent {
  task_id: string;
  agent_type: string;
  /**
   * Canonical agent slug, resolved from the alias the planner emitted.
   * Optional for backward compatibility — older snapshots predating
   * the registry resolver omit this field. Frontend should prefer
   * `agent_display_name` for visible labels and fall back to
   * `agent_canonical_name` then `agent_type`.
   */
  agent_canonical_name?: string;
  /**
   * Human-readable agent label (e.g. "Writing Agent") sourced from
   * the registered class's `profile.name`. Optional for backward
   * compatibility — prefer this for chat-header rendering.
   */
  agent_display_name?: string;
  status: DeepRunSubagentStatus;
  started_at: string | null;
  completed_at: string | null;
  tool_calls: DeepRunToolCall[];
}

export interface DeepRunSnapshot {
  plan_id: string;
  thread_id: string;
  workspace_id: string | null;
  user_id: string;
  status: DeepRunStatus;
  progress_percent: number;
  goal: string;
  agent_type: string;
  /** See DeepRunSubagent.agent_canonical_name. */
  agent_canonical_name?: string;
  /** See DeepRunSubagent.agent_display_name. */
  agent_display_name?: string;
  task_count: number;
  completed_task_count: number;
  started_at: string;
  updated_at: string;
  last_error: string;
  subagents: DeepRunSubagent[];
}

/**
 * Resolve the best label to render for an agent in chat UI surfaces.
 * Prefers the human-readable display name, falls back to the canonical
 * slug, and finally to the raw alias the planner emitted.
 */
export const resolveAgentLabel = (
  agent: Pick<
    DeepRunSnapshot | DeepRunSubagent,
    'agent_display_name' | 'agent_canonical_name' | 'agent_type'
  >
): string =>
  agent.agent_display_name ||
  agent.agent_canonical_name ||
  agent.agent_type ||
  '';

export interface DeepRunEvent {
  id: number;
  timestamp: string;
  event_type: string;
  status: string;
  agent_type: string;
  tool_name: string;
  payload: Record<string, unknown>;
}

export interface DeepRunStats {
  workspace_id: string | null;
  total_runs: number;
  runs_by_status: Record<string, number>;
  runs_by_agent_type: Record<string, number>;
  tool_call_counts: Record<string, number>;
  failure_rate: number;
  window_started_at: string | null;
}

export const isRunActive = (status: DeepRunStatus): boolean =>
  status === 'pending' || status === 'running';
