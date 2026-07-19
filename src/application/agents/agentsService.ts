import { extractExecutionId } from '../../domain/agents/agentExecution';
import {
  buildAgentTeammatePayload,
  normalizeAgentTeammateAlias
} from '../../domain/agents/agentTeammate';
import { normalizeCreateAgentType } from '../../domain/agents/agentTypes';
import { agentsApi } from '../../infrastructure/agents/agentsApi';

export const getAgentTeammateAlias = async (seedId: string | number) => {
  const response = await agentsApi.getTeammate(seedId);
  return normalizeAgentTeammateAlias(response?.data);
};

/**
 * Full assistant identity — name + avatar — from the teammate profile.
 * One fetch feeds both halves of the identity cache in SeedContext so
 * every AssistantAvatar / alias consumer shares a single request.
 */
export const getAgentTeammateProfile = async (seedId: string | number) => {
  const response = await agentsApi.getTeammate(seedId);
  const data = response?.data ?? {};
  return {
    alias: normalizeAgentTeammateAlias(data),
    avatarUrl: typeof data?.avatar_url === 'string' ? data.avatar_url : ''
  };
};

/**
 * PATCH the assistant's avatar only. The backend treats an absent
 * display_name as "leave the name untouched", so this can't wipe the
 * workspace's chosen name. Pass '' to reset to the platform default.
 */
export const updateAgentTeammateAvatar = async (
  seedId: string | number,
  avatarUrl: string
) => {
  const response = await agentsApi.renameTeammate(seedId, {
    workspace_id: seedId,
    avatar_url: typeof avatarUrl === 'string' ? avatarUrl.trim() : ''
  });
  return response?.data ?? {};
};

export const updateAgentTeammateAlias = async (
  seedId: string | number,
  displayName: string
) => {
  const payload = buildAgentTeammatePayload(seedId, displayName);
  const response = await agentsApi.renameTeammate(seedId, payload);
  return {
    ...(response?.data ?? {}),
    display_name: normalizeAgentTeammateAlias(
      response?.data,
      payload.display_name
    )
  };
};

export const executeAgentTask = async (
  agentId: string,
  payload: Record<string, unknown>
) => {
  const response = await agentsApi.execute(agentId, payload);
  const data = response?.data ?? {};

  return {
    ...data,
    execution_id: extractExecutionId(data) || null
  };
};

export const getAgentExecution = async (executionId: string) => {
  const response = await agentsApi.getExecution(executionId);
  return response?.data ?? null;
};

export const getAgentMemoryHistory = async (
  agentId: string,
  params: Record<string, unknown> = {}
) => {
  const response = await agentsApi.getMemoryHistory(agentId, params);
  return response?.data ?? null;
};

export const listAgentExecutions = async (
  agentId: string,
  params: Record<string, unknown> = {}
) => {
  const response = await agentsApi.listExecutions(agentId, params);
  return response?.data ?? null;
};

export const createAgentInstance = async ({
  agentTypeSlug,
  seedId,
  config = {}
}: {
  agentTypeSlug: string;
  seedId: string | number;
  config?: Record<string, unknown>;
}) => {
  const payload = {
    agent_type: normalizeCreateAgentType(agentTypeSlug),
    workspace_id: seedId,
    config: {
      model_name: 'gpt-3.5-turbo',
      temperature: 0.1,
      ...config
    }
  };

  const response = await agentsApi.create(payload);
  return response?.data ?? null;
};

export const getAgentState = async (agentId: string) => {
  const response = await agentsApi.getState(agentId);
  return response?.data ?? null;
};

export const pauseAgentInstance = (agentId: string) => agentsApi.pause(agentId);

export const resumeAgentInstance = (agentId: string) =>
  agentsApi.resume(agentId);

export const deleteAgentInstance = (agentId: string) =>
  agentsApi.remove(agentId);

export const listAgentTypes = async () => {
  const response = await agentsApi.listTypes();
  return response?.data ?? [];
};

export const listAgents = async () => {
  const response = await agentsApi.list();
  return response?.data ?? [];
};
