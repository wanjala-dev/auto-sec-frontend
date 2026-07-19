import apiClient from '../http/apiClient';

const WORKFLOW_BASE = '/workspaces/workflows';

export const workflowApi = {
  fetchTemplates: (params?: Record<string, unknown>) =>
    apiClient.get(
      `${WORKFLOW_BASE}/workflow-templates/`,
      params ? { params } : undefined
    ),

  fetchTemplate: (templateId: string) =>
    apiClient.get(`${WORKFLOW_BASE}/workflow-templates/${templateId}/`),

  createTemplate: (payload: Record<string, unknown>) =>
    apiClient.post(`${WORKFLOW_BASE}/workflow-templates/`, payload),

  fetchWorkflows: (params?: Record<string, unknown>) =>
    apiClient.get(
      `${WORKFLOW_BASE}/workflows/`,
      params ? { params } : undefined
    ),

  fetchWorkflow: (workflowId: string) =>
    apiClient.get(`${WORKFLOW_BASE}/workflows/${workflowId}/`),

  createWorkflow: (payload: Record<string, unknown>) =>
    apiClient.post(`${WORKFLOW_BASE}/workflows/`, payload),

  updateWorkflow: (workflowId: string, payload: Record<string, unknown>) =>
    apiClient.patch(`${WORKFLOW_BASE}/workflows/${workflowId}/`, payload),

  publishWorkflow: (workflowId: string, payload: Record<string, unknown>) =>
    apiClient.post(
      `${WORKFLOW_BASE}/workflows/${workflowId}/publish/`,
      payload
    ),

  archiveWorkflow: (workflowId: string) =>
    apiClient.post(`${WORKFLOW_BASE}/workflows/${workflowId}/archive/`),

  cloneWorkflow: (workflowId: string) =>
    apiClient.post(`${WORKFLOW_BASE}/workflows/${workflowId}/clone/`),

  validateWorkflow: (payload: Record<string, unknown>) =>
    apiClient.post(`${WORKFLOW_BASE}/workflows/validate/`, payload),

  fetchBindings: (params?: Record<string, unknown>) =>
    apiClient.get(
      `${WORKFLOW_BASE}/workflow-bindings/`,
      params ? { params } : undefined
    ),

  createBinding: (payload: Record<string, unknown>) =>
    apiClient.post(`${WORKFLOW_BASE}/workflow-bindings/`, payload),

  deleteBinding: (bindingId: string) =>
    apiClient.delete(`${WORKFLOW_BASE}/workflow-bindings/${bindingId}/`),

  fetchTriggers: (params?: Record<string, unknown>) =>
    apiClient.get(
      `${WORKFLOW_BASE}/workflow-triggers/`,
      params ? { params } : undefined
    ),

  enrollTargets: (workflowId: string, payload: Record<string, unknown>) =>
    apiClient.post(`${WORKFLOW_BASE}/workflows/${workflowId}/enroll/`, payload),

  fetchEnrollments: (workflowId: string, params?: Record<string, unknown>) =>
    apiClient.get(
      `${WORKFLOW_BASE}/workflows/${workflowId}/enrollments/`,
      params ? { params } : undefined
    ),

  unenrollTargets: (workflowId: string, payload: Record<string, unknown>) =>
    apiClient.post(
      `${WORKFLOW_BASE}/workflows/${workflowId}/unenroll/`,
      payload
    ),

  fetchRuns: (workflowId: string, params?: Record<string, unknown>) =>
    apiClient.get(
      `${WORKFLOW_BASE}/workflows/${workflowId}/runs/`,
      params ? { params } : undefined
    ),

  fetchRun: (runId: string) =>
    apiClient.get(`${WORKFLOW_BASE}/workflow-runs/${runId}/`),

  createRuns: (workflowId: string, payload: Record<string, unknown>) =>
    apiClient.post(`${WORKFLOW_BASE}/workflows/${workflowId}/runs/`, payload),

  updateRunStatus: (
    runId: string,
    action: string,
    payload?: Record<string, unknown>
  ) =>
    apiClient.post(
      `${WORKFLOW_BASE}/workflow-runs/${runId}/${action}/`,
      payload
    ),

  fetchRunEvents: (runId: string, params?: Record<string, unknown>) =>
    apiClient.get(
      `${WORKFLOW_BASE}/workflow-runs/${runId}/events/`,
      params ? { params } : undefined
    ),

  completeStep: (
    runId: string,
    nodeId: string,
    payload: Record<string, unknown>
  ) =>
    apiClient.post(
      `${WORKFLOW_BASE}/workflow-runs/${runId}/steps/${nodeId}/complete/`,
      payload
    ),

  submitStepInput: (
    runId: string,
    nodeId: string,
    payload: Record<string, unknown>
  ) =>
    apiClient.post(
      `${WORKFLOW_BASE}/workflow-runs/${runId}/steps/${nodeId}/input/`,
      payload
    ),

  fetchSchedules: (workflowId: string) =>
    apiClient.get(`${WORKFLOW_BASE}/workflows/${workflowId}/schedules/`),

  createSchedule: (workflowId: string, payload: Record<string, unknown>) =>
    apiClient.post(
      `${WORKFLOW_BASE}/workflows/${workflowId}/schedules/`,
      payload
    ),

  updateSchedule: (
    workflowId: string,
    scheduleId: string,
    payload: Record<string, unknown>
  ) =>
    apiClient.patch(
      `${WORKFLOW_BASE}/workflows/${workflowId}/schedules/${scheduleId}/`,
      payload
    ),

  deleteSchedule: (workflowId: string, scheduleId: string) =>
    apiClient.delete(
      `${WORKFLOW_BASE}/workflows/${workflowId}/schedules/${scheduleId}/`
    )
};
