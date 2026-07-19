import { workspaceStateApi } from '../../infrastructure/workspace/workspaceStateApi';

const unwrapData = (payload: any) =>
  payload?.data !== undefined ? payload.data : payload;

const unwrapList = (payload: any) => {
  const data = unwrapData(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const fetchWorkspaceOperations = async (
  workspaceId: string | number
) => {
  const response = await workspaceStateApi.getOperations(workspaceId);
  return unwrapData(response?.data);
};

export const saveWorkspaceOperations = async (
  workspaceId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await workspaceStateApi.updateOperations(
    workspaceId,
    payload
  );
  return unwrapData(response?.data);
};

export const fetchWorkspacePreferences = async (
  workspaceId: string | number
) => {
  const response = await workspaceStateApi.getPreferences(workspaceId);
  return unwrapData(response?.data);
};

export const saveWorkspacePreferences = async (
  workspaceId: string | number,
  payload: Record<string, unknown>
) => {
  try {
    const response = await workspaceStateApi.updatePreferences(
      workspaceId,
      payload
    );
    return unwrapData(response?.data);
  } catch (error: any) {
    const status = error?.response?.status;
    const detail =
      error?.response?.data?.detail || error?.response?.data?.message || '';
    const shouldCreate =
      status === 404 ||
      (status === 400 && /not found|does not exist/i.test(detail));

    if (!shouldCreate) throw error;

    const created = await workspaceStateApi.createPreferences({
      ...payload,
      workspace: workspaceId
    });
    return unwrapData(created?.data);
  }
};

export const fetchWorkspaceActions = async (workspaceId: string | number) => {
  const response = await workspaceStateApi.getActions(workspaceId);
  return unwrapList(response?.data);
};

export const createWorkspaceAction = async (
  workspaceId: string | number,
  ownerId: string | number,
  title: string
) => {
  const response = await workspaceStateApi.createAction({
    workspace: workspaceId,
    owner: ownerId,
    title
  });
  return unwrapData(response?.data);
};
