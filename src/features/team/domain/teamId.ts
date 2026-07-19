export const normalizeTeamId = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'object') {
    return normalizeTeamId(
      value.team_id ??
        value.teamId ??
        value.id ??
        value.pk ??
        value.uuid ??
        value.team?.id ??
        value.team?.team_id ??
        value.team?.pk
    );
  }
  return null;
};

export const deriveTeamId = (payload: any): string | null => {
  if (!payload) return null;
  return normalizeTeamId(
    payload.team_id ??
      payload.teamId ??
      payload.team?.id ??
      payload.team?.team_id ??
      payload.id ??
      payload.pk ??
      payload.uuid
  );
};

export const pickFirstTeamId = (teams: any[] = []): string | null => {
  if (!Array.isArray(teams)) return null;
  for (const team of teams) {
    const teamId = normalizeTeamId(team);
    if (teamId) return teamId;
  }
  return null;
};
