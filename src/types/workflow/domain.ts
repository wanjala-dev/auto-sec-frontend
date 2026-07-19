export interface WorkflowNode {
  id: string;
  title: string;
  subtitle?: string;
  tone: string;
  config?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  label?: string | null;
}

export interface WorkflowTemplate {
  id: string;
  label: string;
  category?: string | string[];
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  [key: string]: unknown;
}

export type WorkflowOption = {
  id: string;
  label: string;
  description?: string;
  category?: string | string[];
};

export type WorkflowGoal = {
  id: string;
  label: string;
};

export type WorkflowNodeType = {
  id: string;
  label: string;
};

export type WorkflowMapListState<T = any> = {
  items: T[];
  loading: boolean;
  error: string | null;
  fetchedAt: number;
};

export interface WorkflowState {
  selectedMemberIds: Record<string, boolean>;
  templateId: string;
  workflowName: string;
  workflowGoal: string;
  lastStarted: Record<string, unknown> | null;
  graphNodes: WorkflowNode[];
  graphEdges: WorkflowEdge[];
  selectedNodeId: string | null;
  newNodeDraft: Record<string, unknown>;
  templates: WorkflowMapListState<WorkflowTemplate>;
  templatesById: Record<string, WorkflowTemplate>;
  templateDetail: {
    item: WorkflowTemplate | null;
    loading: boolean;
    error: string | null;
    fetchedAt: number;
  };
  workflows: WorkflowMapListState;
  workflowsById: Record<string, any>;
  workflowDetail: {
    item: any;
    loading: boolean;
    error: string | null;
    fetchedAt: number;
  };
  bindings: WorkflowMapListState;
  triggers: WorkflowMapListState;
  enrollmentsByWorkflow: Record<string, WorkflowMapListState>;
  runsByWorkflow: Record<string, WorkflowMapListState>;
  runsById: Record<string, any>;
  runDetail: {
    item: any;
    loading: boolean;
    error: string | null;
    fetchedAt: number;
  };
  runEventsByRun: Record<string, WorkflowMapListState>;
  validation: {
    loading: boolean;
    valid: boolean | null;
    errors: any[];
    error: string | null;
  };
  runQueue: { loading: boolean; runIds: string[]; error: string | null };
}

export interface WorkflowAction {
  type: string;
  payload?: any;
}

export interface WorkflowContextValue {
  workflowState: WorkflowState;
  workflowTemplate: WorkflowTemplate;
  workflowTemplates: WorkflowTemplate[];
  workflowTemplateOptions: WorkflowOption[];
  workflowGoals: WorkflowGoal[];
  workflowNodeTypes: WorkflowNodeType[];
  workflowHelperCopy: Record<string, string>;
  [key: string]: any;
}
