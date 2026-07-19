import { aiChatApi } from '../../infrastructure/aiChat/aiChatApi';
import type {
  DeepRunEvent,
  DeepRunSnapshot,
  DeepRunStats
} from '../../domain/aiChat/deepRun';

export const getDeepRunSnapshot = async (
  planId: string
): Promise<DeepRunSnapshot | null> => {
  try {
    const response = await aiChatApi.getDeepRunSnapshot(planId);
    return (response?.data as DeepRunSnapshot) || null;
  } catch (err: any) {
    // 404 is expected until the run is registered — swallow.
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

export const getDeepRunEvents = async (
  planId: string,
  since?: string,
  limit = 200
): Promise<DeepRunEvent[]> => {
  try {
    const params: { since?: string; limit?: number } = { limit };
    if (since) params.since = since;
    const response = await aiChatApi.getDeepRunEvents(planId, params);
    const data = response?.data as { events?: DeepRunEvent[] } | undefined;
    return data?.events || [];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
};

export const getDeepRunStats = async (
  workspaceId?: string
): Promise<DeepRunStats | null> => {
  try {
    const params = workspaceId ? { workspace_id: workspaceId } : undefined;
    const response = await aiChatApi.getDeepRunStats(params);
    return (response?.data as DeepRunStats) || null;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};
