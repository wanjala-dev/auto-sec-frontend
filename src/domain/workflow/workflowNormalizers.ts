import type {
  WorkflowListEnvelope,
  WorkflowRunQueueResponse,
  WorkflowRunResponse,
  WorkflowTemplate,
  WorkflowTemplateApi,
  WorkflowUnenrollResponse
} from '../../types/workflow';

export const normalizeListResponse = <T>(
  value?: WorkflowListEnvelope<T> | T[] | null
): T[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.data?.results)) return value.data.results;
  return [];
};

export const normalizeTemplateGraph = <T extends WorkflowTemplateApi>(
  template?: T | null
): WorkflowTemplate => {
  const graph = template?.default_graph || template?.graph || {};
  const nodes = Array.isArray(graph.nodes)
    ? graph.nodes
    : Array.isArray(template?.nodes)
    ? template.nodes
    : [];
  const edges = Array.isArray(graph.edges)
    ? graph.edges
    : Array.isArray(template?.edges)
    ? template.edges
    : [];

  return {
    id: String(template?.id || 'custom'),
    label: String(template?.label || 'Workflow'),
    category: template?.category,
    description: template?.description,
    ...(template || {}),
    nodes,
    edges
  } as WorkflowTemplate;
};

export const normalizeRunIds = (
  payload?: WorkflowRunQueueResponse | null
): string[] => {
  const runIds = payload?.run_ids || payload?.runIds || [];
  return Array.isArray(runIds) ? runIds : [];
};

export const normalizeRemovedIds = (
  payload?: WorkflowUnenrollResponse | null
): string[] | null => {
  const removedIds = payload?.removed_ids || payload?.removedIds || null;
  return Array.isArray(removedIds) ? removedIds : null;
};

export const normalizeRunPayload = <T extends WorkflowRunResponse>(
  runId: string | null | undefined,
  responseData: T | null | undefined,
  existingRun?: Record<string, unknown> | null
): Record<string, unknown> | null => {
  if (!runId && !responseData) return null;
  if (responseData?.id) return responseData;
  const resolvedRunId = responseData?.run_id || responseData?.runId || runId;
  if (!resolvedRunId) {
    return (
      (existingRun as Record<string, unknown>) ||
      (responseData as Record<string, unknown>) ||
      null
    );
  }
  if (!responseData) {
    return existingRun
      ? { ...existingRun, id: resolvedRunId }
      : { id: resolvedRunId };
  }
  return {
    ...(existingRun || {}),
    ...responseData,
    id: resolvedRunId
  };
};
