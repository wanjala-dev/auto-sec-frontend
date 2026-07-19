import type { WorkflowEdge, WorkflowNode, WorkflowTemplate } from './domain';

export type WorkflowQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface WorkflowListEnvelope<T> {
  results?: T[];
  data?: T[] | { results?: T[] };
}

export interface WorkflowTemplateApi extends Partial<WorkflowTemplate> {
  default_graph?: {
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
  };
  graph?: {
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
  };
}

export interface WorkflowEnrollResponse {
  enrollments?: unknown[];
}

export interface WorkflowRunQueueResponse {
  run_ids?: string[];
  runIds?: string[];
}

export interface WorkflowRunResponse {
  id?: string;
  run_id?: string;
  runId?: string;
  [key: string]: unknown;
}

export interface WorkflowUnenrollResponse {
  removed_ids?: string[];
  removedIds?: string[];
}
