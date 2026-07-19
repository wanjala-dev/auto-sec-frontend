const DEFAULT_TEAMMATE_ALIAS = 'Orchestrator Agent';

export const normalizeAgentTeammateAlias = (
  payload: Record<string, any> = {},
  fallback = DEFAULT_TEAMMATE_ALIAS
) => {
  const alias =
    payload?.display_name ??
    payload?.ai_teammate_display_name ??
    payload?.name ??
    fallback;

  return typeof alias === 'string' && alias.trim().length
    ? alias.trim()
    : fallback;
};

export const buildAgentTeammatePayload = (
  seedId: string | number,
  displayName: string
) => ({
  workspace_id: seedId,
  display_name: normalizeAgentTeammateAlias(
    { display_name: displayName },
    DEFAULT_TEAMMATE_ALIAS
  )
});
