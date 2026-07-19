import { normalizeSetupStatusResult } from '../../domain/announcements/bannerCollections';
import {
  normalizeCommunicationChannelCollection,
  normalizeWorkspaceIdList
} from '../../domain/workspace/workspaceEngagement';
import {
  normalizeWorkspaceCollection,
  normalizeWorkspaceRecord
} from '../../domain/workspace/workspaceCollections';
import { workspaceApi } from '../../infrastructure/workspace/workspaceApi';

export const listWorkspaces = async () => {
  const response = await workspaceApi.list();
  return normalizeWorkspaceCollection(response?.data);
};

export const fetchWorkspaceDetail = async (workspaceId: string | number) => {
  const response = await workspaceApi.getDetail(workspaceId);
  return normalizeWorkspaceRecord(response?.data);
};

export const createWorkspace = async (payload: Record<string, unknown>) => {
  const response = await workspaceApi.create(payload);
  return response?.data ?? null;
};

export const createWorkspaceWithLegacyFallback = createWorkspace;

export const addWorkspaceContributor = (
  workspaceId: string | number,
  payload: Record<string, unknown>
) => workspaceApi.addContributor(workspaceId, payload);

export const updateWorkspaceDetail = async (
  workspaceId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await workspaceApi.update(workspaceId, payload);
  return normalizeWorkspaceRecord(response?.data);
};

export const fetchWorkspaceSetupStatus = async (
  workspaceId: string | number,
  params: Record<string, unknown> = {}
) => {
  const response = await workspaceApi.getSetupStatus(workspaceId, params);
  return normalizeSetupStatusResult(response?.data, workspaceId);
};

export const followWorkspace = async (workspaceId: string | number) => {
  const response = await workspaceApi.followWorkspace(workspaceId);
  return response?.data ?? null;
};

export const unfollowWorkspace = async (workspaceId: string | number) => {
  const response = await workspaceApi.unfollowWorkspace(workspaceId);
  return response?.data ?? null;
};

export const followWorkspaces = async (
  workspaceIds: Array<string | number>
) => {
  const normalizedIds = normalizeWorkspaceIdList(workspaceIds);
  if (!normalizedIds.length) {
    return { followed: [] };
  }

  const response = await workspaceApi.followWorkspaces(normalizedIds);
  return response?.data ?? { followed: normalizedIds };
};

export const unfollowWorkspaces = async (
  workspaceIds: Array<string | number>
) => {
  const normalizedIds = normalizeWorkspaceIdList(workspaceIds);
  if (!normalizedIds.length) {
    return { unfollowed: [] };
  }

  const response = await workspaceApi.unfollowWorkspaces(normalizedIds);
  return response?.data ?? { unfollowed: normalizedIds };
};

export const listWorkspaceCommunicationChannels = async (
  workspaceId: string | number
) => {
  const response = await workspaceApi.listCommunicationChannels(workspaceId);
  return normalizeCommunicationChannelCollection(response?.data);
};
