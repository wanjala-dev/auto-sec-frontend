export const TERMINAL_AGENT_STATUSES = [
  'completed',
  'succeeded',
  'failed',
  'canceled',
  'cancelled',
  'error'
];

export const normalizeAgentStatus = (status: any, fallback = '') =>
  (status || fallback || '').toString().toLowerCase();

export const isTerminalAgentStatus = (status: any) =>
  TERMINAL_AGENT_STATUSES.includes(normalizeAgentStatus(status));

export const extractExecutionId = (payload: Record<string, any> = {}) => {
  const directId = payload?.execution_id || payload?.id || payload?.task_id;
  if (directId) {
    return directId;
  }

  if (payload?.poll_url) {
    const match = payload.poll_url.match(/executions\/(.*?)(?:\/)?$/);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};
