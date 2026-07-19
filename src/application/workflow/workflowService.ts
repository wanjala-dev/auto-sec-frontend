import { workflowApi } from '../../infrastructure/workflow/workflowApi';

export const workflowService = {
  fetchWorkflowTemplates: (params?: Record<string, unknown>) =>
    workflowApi.fetchTemplates(params),
  fetchWorkflowTemplate: (templateId: string) =>
    workflowApi.fetchTemplate(templateId),
  createWorkflowTemplate: (payload: Record<string, unknown>) =>
    workflowApi.createTemplate(payload),
  fetchWorkflows: (params?: Record<string, unknown>) =>
    workflowApi.fetchWorkflows(params),
  fetchWorkflow: (workflowId: string) => workflowApi.fetchWorkflow(workflowId),
  createWorkflow: (payload: Record<string, unknown>) =>
    workflowApi.createWorkflow(payload),
  updateWorkflow: (workflowId: string, payload: Record<string, unknown>) =>
    workflowApi.updateWorkflow(workflowId, payload),
  publishWorkflow: (
    workflowId: string,
    payload: Record<string, unknown> = {}
  ) => workflowApi.publishWorkflow(workflowId, payload),
  archiveWorkflow: (workflowId: string) =>
    workflowApi.archiveWorkflow(workflowId),
  cloneWorkflow: (workflowId: string) => workflowApi.cloneWorkflow(workflowId),
  validateWorkflow: (payload: Record<string, unknown>) =>
    workflowApi.validateWorkflow(payload),
  fetchWorkflowBindings: (params?: Record<string, unknown>) =>
    workflowApi.fetchBindings(params),
  createWorkflowBinding: (payload: Record<string, unknown>) =>
    workflowApi.createBinding(payload),
  deleteWorkflowBinding: (bindingId: string) =>
    workflowApi.deleteBinding(bindingId),
  fetchWorkflowTriggers: (params?: Record<string, unknown>) =>
    workflowApi.fetchTriggers(params),
  enrollWorkflowTargets: (
    workflowId: string,
    payload: Record<string, unknown>
  ) => workflowApi.enrollTargets(workflowId, payload),
  fetchWorkflowEnrollments: (
    workflowId: string,
    params?: Record<string, unknown>
  ) => workflowApi.fetchEnrollments(workflowId, params),
  unenrollWorkflowTargets: (
    workflowId: string,
    payload: Record<string, unknown>
  ) => workflowApi.unenrollTargets(workflowId, payload),
  fetchWorkflowRuns: (workflowId: string, params?: Record<string, unknown>) =>
    workflowApi.fetchRuns(workflowId, params),
  fetchWorkflowRun: (runId: string) => workflowApi.fetchRun(runId),
  createWorkflowRuns: (workflowId: string, payload: Record<string, unknown>) =>
    workflowApi.createRuns(workflowId, payload),
  updateWorkflowRunStatus: (
    runId: string,
    action: string,
    payload?: Record<string, unknown>
  ) => workflowApi.updateRunStatus(runId, action, payload),
  fetchWorkflowRunEvents: (runId: string, params?: Record<string, unknown>) =>
    workflowApi.fetchRunEvents(runId, params),
  completeWorkflowStep: (
    runId: string,
    nodeId: string,
    payload: Record<string, unknown>
  ) => workflowApi.completeStep(runId, nodeId, payload),
  submitWorkflowStepInput: (
    runId: string,
    nodeId: string,
    payload: Record<string, unknown>
  ) => workflowApi.submitStepInput(runId, nodeId, payload)
};
