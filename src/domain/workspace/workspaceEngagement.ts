import { normalizeWorkspaceId as normalizeSeedId } from '../../domain/workspace/workspaceId';

export const normalizeCommunicationChannelRow = (channel: any) => {
  if (!channel) return null;
  const identifier =
    channel.id ||
    channel.pk ||
    channel.uuid ||
    channel.slug ||
    channel.channel_id;

  if (!identifier) {
    return null;
  }

  return {
    id: String(identifier),
    name:
      channel.name ||
      channel.label ||
      channel.channel_type ||
      channel.type ||
      'Untitled channel'
  };
};

export const normalizeCommunicationChannelCollection = (payload: any) => {
  const rows = Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
    ? payload
    : [];

  return rows.map(normalizeCommunicationChannelRow).filter(Boolean);
};

export const normalizeWorkspaceIdList = (workspaceIds: any[] = []) =>
  Array.from(
    new Set(
      (Array.isArray(workspaceIds) ? workspaceIds : [])
        .map((id) => normalizeSeedId(id))
        .filter(Boolean)
    )
  );
