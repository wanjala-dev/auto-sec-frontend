import { useCallback } from 'react';
import { workflowService } from '../../../application/workflow/workflowService';
import {
  WORKFLOW_ARCHIVE_FAILURE,
  WORKFLOW_ARCHIVE_REQUEST,
  WORKFLOW_ARCHIVE_SUCCESS,
  WORKFLOW_BINDINGS_FAILURE,
  WORKFLOW_BINDINGS_REQUEST,
  WORKFLOW_BINDINGS_SUCCESS,
  WORKFLOW_BINDING_CREATE_FAILURE,
  WORKFLOW_BINDING_CREATE_REQUEST,
  WORKFLOW_BINDING_CREATE_SUCCESS,
  WORKFLOW_BINDING_DELETE_FAILURE,
  WORKFLOW_BINDING_DELETE_REQUEST,
  WORKFLOW_BINDING_DELETE_SUCCESS,
  WORKFLOW_CLONE_FAILURE,
  WORKFLOW_CLONE_REQUEST,
  WORKFLOW_CLONE_SUCCESS,
  WORKFLOW_CREATE_FAILURE,
  WORKFLOW_CREATE_REQUEST,
  WORKFLOW_CREATE_SUCCESS,
  WORKFLOW_DETAIL_FAILURE,
  WORKFLOW_DETAIL_REQUEST,
  WORKFLOW_DETAIL_SUCCESS,
  WORKFLOW_ENROLLMENTS_FAILURE,
  WORKFLOW_ENROLLMENTS_REQUEST,
  WORKFLOW_ENROLLMENTS_SUCCESS,
  WORKFLOW_ENROLL_FAILURE,
  WORKFLOW_ENROLL_REQUEST,
  WORKFLOW_ENROLL_SUCCESS,
  WORKFLOW_LIST_FAILURE,
  WORKFLOW_LIST_REQUEST,
  WORKFLOW_LIST_SUCCESS,
  WORKFLOW_PUBLISH_FAILURE,
  WORKFLOW_PUBLISH_REQUEST,
  WORKFLOW_PUBLISH_SUCCESS,
  WORKFLOW_RUNS_FAILURE,
  WORKFLOW_RUNS_REQUEST,
  WORKFLOW_RUNS_SUCCESS,
  WORKFLOW_RUN_ACTION_FAILURE,
  WORKFLOW_RUN_ACTION_REQUEST,
  WORKFLOW_RUN_ACTION_SUCCESS,
  WORKFLOW_RUN_CREATE_FAILURE,
  WORKFLOW_RUN_CREATE_REQUEST,
  WORKFLOW_RUN_CREATE_SUCCESS,
  WORKFLOW_RUN_EVENTS_FAILURE,
  WORKFLOW_RUN_EVENTS_REQUEST,
  WORKFLOW_RUN_EVENTS_SUCCESS,
  WORKFLOW_RUN_FAILURE,
  WORKFLOW_RUN_REQUEST,
  WORKFLOW_RUN_SUCCESS,
  WORKFLOW_STEP_COMPLETE_FAILURE,
  WORKFLOW_STEP_COMPLETE_REQUEST,
  WORKFLOW_STEP_COMPLETE_SUCCESS,
  WORKFLOW_STEP_INPUT_FAILURE,
  WORKFLOW_STEP_INPUT_REQUEST,
  WORKFLOW_STEP_INPUT_SUCCESS,
  WORKFLOW_TEMPLATES_FAILURE,
  WORKFLOW_TEMPLATES_REQUEST,
  WORKFLOW_TEMPLATES_SUCCESS,
  WORKFLOW_TEMPLATE_CREATE_FAILURE,
  WORKFLOW_TEMPLATE_CREATE_REQUEST,
  WORKFLOW_TEMPLATE_CREATE_SUCCESS,
  WORKFLOW_TEMPLATE_FAILURE,
  WORKFLOW_TEMPLATE_REQUEST,
  WORKFLOW_TEMPLATE_SUCCESS,
  WORKFLOW_TRIGGERS_FAILURE,
  WORKFLOW_TRIGGERS_REQUEST,
  WORKFLOW_TRIGGERS_SUCCESS,
  WORKFLOW_UNENROLL_FAILURE,
  WORKFLOW_UNENROLL_REQUEST,
  WORKFLOW_UNENROLL_SUCCESS,
  WORKFLOW_UPDATE_FAILURE,
  WORKFLOW_UPDATE_REQUEST,
  WORKFLOW_UPDATE_SUCCESS,
  WORKFLOW_VALIDATE_FAILURE,
  WORKFLOW_VALIDATE_REQUEST,
  WORKFLOW_VALIDATE_SUCCESS
} from '../../../types/workflow';

export const useWorkflowOperationsPresentation = ({
  dispatch,
  getErrorMessage,
  normalizeListResponse,
  normalizeRemovedIds,
  normalizeRunIds,
  normalizeRunPayload,
  state
}: {
  dispatch: any;
  getErrorMessage: (error: any, fallback: string) => string;
  normalizeListResponse: (payload: any) => any[];
  normalizeRemovedIds: (payload: any) => any[];
  normalizeRunIds: (payload: any) => any[];
  normalizeRunPayload: (runId: any, payload: any, existingRun?: any) => any;
  state: any;
}) => {
  const fetchWorkflowTemplates = useCallback(
    async (params) => {
      dispatch({ type: WORKFLOW_TEMPLATES_REQUEST });
      try {
        const response = await workflowService.fetchWorkflowTemplates(params);
        const items = normalizeListResponse(response?.data);
        dispatch({ type: WORKFLOW_TEMPLATES_SUCCESS, payload: items });
        return items;
      } catch (error) {
        dispatch({
          type: WORKFLOW_TEMPLATES_FAILURE,
          payload: getErrorMessage(error, 'Unable to load workflow templates.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage, normalizeListResponse]
  );

  const fetchWorkflowTemplate = useCallback(
    async (templateId) => {
      if (!templateId) return null;
      dispatch({ type: WORKFLOW_TEMPLATE_REQUEST });
      try {
        const response = await workflowService.fetchWorkflowTemplate(
          templateId
        );
        dispatch({ type: WORKFLOW_TEMPLATE_SUCCESS, payload: response?.data });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_TEMPLATE_FAILURE,
          payload: getErrorMessage(error, 'Unable to load workflow template.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const createWorkflowTemplate = useCallback(
    async (payload) => {
      dispatch({ type: WORKFLOW_TEMPLATE_CREATE_REQUEST });
      try {
        const response = await workflowService.createWorkflowTemplate(payload);
        dispatch({
          type: WORKFLOW_TEMPLATE_CREATE_SUCCESS,
          payload: response?.data
        });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_TEMPLATE_CREATE_FAILURE,
          payload: getErrorMessage(error, 'Unable to create workflow template.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const fetchWorkflows = useCallback(
    async (params) => {
      dispatch({ type: WORKFLOW_LIST_REQUEST });
      try {
        const response = await workflowService.fetchWorkflows(params);
        const items = normalizeListResponse(response?.data);
        dispatch({ type: WORKFLOW_LIST_SUCCESS, payload: items });
        return items;
      } catch (error) {
        dispatch({
          type: WORKFLOW_LIST_FAILURE,
          payload: getErrorMessage(error, 'Unable to load workflows.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage, normalizeListResponse]
  );

  const fetchWorkflow = useCallback(
    async (workflowId) => {
      if (!workflowId) return null;
      dispatch({ type: WORKFLOW_DETAIL_REQUEST });
      try {
        const response = await workflowService.fetchWorkflow(workflowId);
        dispatch({ type: WORKFLOW_DETAIL_SUCCESS, payload: response?.data });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_DETAIL_FAILURE,
          payload: getErrorMessage(error, 'Unable to load workflow.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const createWorkflow = useCallback(
    async (payload) => {
      dispatch({ type: WORKFLOW_CREATE_REQUEST });
      try {
        const response = await workflowService.createWorkflow(payload);
        dispatch({ type: WORKFLOW_CREATE_SUCCESS, payload: response?.data });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_CREATE_FAILURE,
          payload: getErrorMessage(error, 'Unable to create workflow.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const updateWorkflow = useCallback(
    async (workflowId, payload) => {
      if (!workflowId) return null;
      dispatch({ type: WORKFLOW_UPDATE_REQUEST });
      try {
        const response = await workflowService.updateWorkflow(
          workflowId,
          payload
        );
        dispatch({ type: WORKFLOW_UPDATE_SUCCESS, payload: response?.data });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_UPDATE_FAILURE,
          payload: getErrorMessage(error, 'Unable to update workflow.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const publishWorkflow = useCallback(
    async (workflowId, payload) => {
      if (!workflowId) return null;
      dispatch({ type: WORKFLOW_PUBLISH_REQUEST });
      try {
        const response = await workflowService.publishWorkflow(
          workflowId,
          payload || {}
        );
        dispatch({ type: WORKFLOW_PUBLISH_SUCCESS, payload: response?.data });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_PUBLISH_FAILURE,
          payload: getErrorMessage(error, 'Unable to publish workflow.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const archiveWorkflow = useCallback(
    async (workflowId) => {
      if (!workflowId) return null;
      dispatch({ type: WORKFLOW_ARCHIVE_REQUEST });
      try {
        const response = await workflowService.archiveWorkflow(workflowId);
        dispatch({ type: WORKFLOW_ARCHIVE_SUCCESS, payload: response?.data });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_ARCHIVE_FAILURE,
          payload: getErrorMessage(error, 'Unable to archive workflow.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const cloneWorkflow = useCallback(
    async (workflowId) => {
      if (!workflowId) return null;
      dispatch({ type: WORKFLOW_CLONE_REQUEST });
      try {
        const response = await workflowService.cloneWorkflow(workflowId);
        dispatch({ type: WORKFLOW_CLONE_SUCCESS, payload: response?.data });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_CLONE_FAILURE,
          payload: getErrorMessage(error, 'Unable to clone workflow.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const validateWorkflow = useCallback(
    async (payload) => {
      dispatch({ type: WORKFLOW_VALIDATE_REQUEST });
      try {
        const response = await workflowService.validateWorkflow(payload);
        dispatch({ type: WORKFLOW_VALIDATE_SUCCESS, payload: response?.data });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_VALIDATE_FAILURE,
          payload: getErrorMessage(error, 'Unable to validate workflow.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const fetchWorkflowBindings = useCallback(
    async (params) => {
      dispatch({ type: WORKFLOW_BINDINGS_REQUEST });
      try {
        const response = await workflowService.fetchWorkflowBindings(params);
        const items = normalizeListResponse(response?.data);
        dispatch({ type: WORKFLOW_BINDINGS_SUCCESS, payload: items });
        return items;
      } catch (error) {
        dispatch({
          type: WORKFLOW_BINDINGS_FAILURE,
          payload: getErrorMessage(error, 'Unable to load workflow bindings.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage, normalizeListResponse]
  );

  const createWorkflowBinding = useCallback(
    async (payload) => {
      dispatch({ type: WORKFLOW_BINDING_CREATE_REQUEST });
      try {
        const response = await workflowService.createWorkflowBinding(payload);
        dispatch({
          type: WORKFLOW_BINDING_CREATE_SUCCESS,
          payload: response?.data
        });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_BINDING_CREATE_FAILURE,
          payload: getErrorMessage(error, 'Unable to create workflow binding.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const deleteWorkflowBinding = useCallback(
    async (bindingId) => {
      if (!bindingId) return null;
      dispatch({ type: WORKFLOW_BINDING_DELETE_REQUEST });
      try {
        await workflowService.deleteWorkflowBinding(bindingId);
        dispatch({ type: WORKFLOW_BINDING_DELETE_SUCCESS, payload: bindingId });
        return true;
      } catch (error) {
        dispatch({
          type: WORKFLOW_BINDING_DELETE_FAILURE,
          payload: getErrorMessage(error, 'Unable to delete workflow binding.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const fetchWorkflowTriggers = useCallback(
    async (params) => {
      dispatch({ type: WORKFLOW_TRIGGERS_REQUEST });
      try {
        const response = await workflowService.fetchWorkflowTriggers(params);
        const items = normalizeListResponse(response?.data);
        dispatch({ type: WORKFLOW_TRIGGERS_SUCCESS, payload: items });
        return items;
      } catch (error) {
        dispatch({
          type: WORKFLOW_TRIGGERS_FAILURE,
          payload: getErrorMessage(error, 'Unable to load workflow triggers.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage, normalizeListResponse]
  );

  const enrollWorkflowTargets = useCallback(
    async (workflowId, payload) => {
      if (!workflowId) return null;
      dispatch({ type: WORKFLOW_ENROLL_REQUEST, payload: { workflowId } });
      try {
        const response = await workflowService.enrollWorkflowTargets(
          workflowId,
          payload
        );
        const enrollments = normalizeListResponse(response?.data?.enrollments);
        dispatch({
          type: WORKFLOW_ENROLL_SUCCESS,
          payload: { workflowId, enrollments }
        });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_ENROLL_FAILURE,
          payload: {
            workflowId,
            error: getErrorMessage(error, 'Unable to enroll workflow targets.')
          }
        });
        return null;
      }
    },
    [dispatch, getErrorMessage, normalizeListResponse]
  );

  const fetchWorkflowEnrollments = useCallback(
    async (workflowId, params) => {
      if (!workflowId) return null;
      dispatch({ type: WORKFLOW_ENROLLMENTS_REQUEST, payload: { workflowId } });
      try {
        const response = await workflowService.fetchWorkflowEnrollments(
          workflowId,
          params
        );
        const enrollments = normalizeListResponse(response?.data);
        dispatch({
          type: WORKFLOW_ENROLLMENTS_SUCCESS,
          payload: { workflowId, enrollments }
        });
        return enrollments;
      } catch (error) {
        dispatch({
          type: WORKFLOW_ENROLLMENTS_FAILURE,
          payload: {
            workflowId,
            error: getErrorMessage(error, 'Unable to load enrollments.')
          }
        });
        return null;
      }
    },
    [dispatch, getErrorMessage, normalizeListResponse]
  );

  const unenrollWorkflowTargets = useCallback(
    async (workflowId, payload) => {
      if (!workflowId) return null;
      dispatch({ type: WORKFLOW_UNENROLL_REQUEST, payload: { workflowId } });
      try {
        const response = await workflowService.unenrollWorkflowTargets(
          workflowId,
          payload
        );
        const removedIds = normalizeRemovedIds(response?.data);
        dispatch({
          type: WORKFLOW_UNENROLL_SUCCESS,
          payload: { workflowId, removedIds }
        });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_UNENROLL_FAILURE,
          payload: {
            workflowId,
            error: getErrorMessage(
              error,
              'Unable to unenroll workflow targets.'
            )
          }
        });
        return null;
      }
    },
    [dispatch, getErrorMessage, normalizeRemovedIds]
  );

  const fetchWorkflowRuns = useCallback(
    async (workflowId, params) => {
      if (!workflowId) return null;
      dispatch({ type: WORKFLOW_RUNS_REQUEST, payload: { workflowId } });
      try {
        const response = await workflowService.fetchWorkflowRuns(
          workflowId,
          params
        );
        const runs = normalizeListResponse(response?.data);
        dispatch({
          type: WORKFLOW_RUNS_SUCCESS,
          payload: { workflowId, runs }
        });
        return runs;
      } catch (error) {
        dispatch({
          type: WORKFLOW_RUNS_FAILURE,
          payload: {
            workflowId,
            error: getErrorMessage(error, 'Unable to load workflow runs.')
          }
        });
        return null;
      }
    },
    [dispatch, getErrorMessage, normalizeListResponse]
  );

  const fetchWorkflowRun = useCallback(
    async (runId) => {
      if (!runId) return null;
      dispatch({ type: WORKFLOW_RUN_REQUEST });
      try {
        const response = await workflowService.fetchWorkflowRun(runId);
        dispatch({ type: WORKFLOW_RUN_SUCCESS, payload: response?.data });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_RUN_FAILURE,
          payload: getErrorMessage(error, 'Unable to load workflow run.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const createWorkflowRuns = useCallback(
    async (workflowId, payload) => {
      if (!workflowId) return null;
      dispatch({ type: WORKFLOW_RUN_CREATE_REQUEST });
      try {
        const response = await workflowService.createWorkflowRuns(
          workflowId,
          payload
        );
        const runIds = normalizeRunIds(response?.data);
        dispatch({
          type: WORKFLOW_RUN_CREATE_SUCCESS,
          payload: { runIds }
        });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_RUN_CREATE_FAILURE,
          payload: getErrorMessage(error, 'Unable to create workflow run.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage, normalizeRunIds]
  );

  const updateWorkflowRunStatus = useCallback(
    async (runId, action, payload) => {
      if (!runId || !action) return null;
      dispatch({ type: WORKFLOW_RUN_ACTION_REQUEST });
      try {
        const response = await workflowService.updateWorkflowRunStatus(
          runId,
          action,
          payload
        );
        dispatch({
          type: WORKFLOW_RUN_ACTION_SUCCESS,
          payload: response?.data
        });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_RUN_ACTION_FAILURE,
          payload: getErrorMessage(error, 'Unable to update workflow run.')
        });
        return null;
      }
    },
    [dispatch, getErrorMessage]
  );

  const fetchWorkflowRunEvents = useCallback(
    async (runId, params) => {
      if (!runId) return null;
      dispatch({ type: WORKFLOW_RUN_EVENTS_REQUEST, payload: { runId } });
      try {
        const response = await workflowService.fetchWorkflowRunEvents(
          runId,
          params
        );
        const events = normalizeListResponse(response?.data);
        dispatch({
          type: WORKFLOW_RUN_EVENTS_SUCCESS,
          payload: { runId, events }
        });
        return events;
      } catch (error) {
        dispatch({
          type: WORKFLOW_RUN_EVENTS_FAILURE,
          payload: {
            runId,
            error: getErrorMessage(error, 'Unable to load run events.')
          }
        });
        return null;
      }
    },
    [dispatch, getErrorMessage, normalizeListResponse]
  );

  const completeWorkflowStep = useCallback(
    async (runId, nodeId, payload) => {
      if (!runId || !nodeId) return null;
      dispatch({ type: WORKFLOW_STEP_COMPLETE_REQUEST });
      try {
        const response = await workflowService.completeWorkflowStep(
          runId,
          nodeId,
          payload
        );
        const existingRun =
          state.runDetail?.item?.id === runId
            ? state.runDetail.item
            : state.runsById?.[runId];
        const normalized = normalizeRunPayload(
          runId,
          response?.data,
          existingRun
        );
        dispatch({ type: WORKFLOW_STEP_COMPLETE_SUCCESS, payload: normalized });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_STEP_COMPLETE_FAILURE,
          payload: getErrorMessage(error, 'Unable to update workflow step.')
        });
        return null;
      }
    },
    [
      dispatch,
      getErrorMessage,
      normalizeRunPayload,
      state.runDetail?.item,
      state.runsById
    ]
  );

  const submitWorkflowStepInput = useCallback(
    async (runId, nodeId, payload) => {
      if (!runId || !nodeId) return null;
      dispatch({ type: WORKFLOW_STEP_INPUT_REQUEST });
      try {
        const response = await workflowService.submitWorkflowStepInput(
          runId,
          nodeId,
          payload
        );
        const existingRun =
          state.runDetail?.item?.id === runId
            ? state.runDetail.item
            : state.runsById?.[runId];
        const normalized = normalizeRunPayload(
          runId,
          response?.data,
          existingRun
        );
        dispatch({ type: WORKFLOW_STEP_INPUT_SUCCESS, payload: normalized });
        return response?.data || null;
      } catch (error) {
        dispatch({
          type: WORKFLOW_STEP_INPUT_FAILURE,
          payload: getErrorMessage(error, 'Unable to update workflow step.')
        });
        return null;
      }
    },
    [
      dispatch,
      getErrorMessage,
      normalizeRunPayload,
      state.runDetail?.item,
      state.runsById
    ]
  );

  return {
    fetchWorkflowTemplates,
    fetchWorkflowTemplate,
    createWorkflowTemplate,
    fetchWorkflows,
    fetchWorkflow,
    createWorkflow,
    updateWorkflow,
    publishWorkflow,
    archiveWorkflow,
    cloneWorkflow,
    validateWorkflow,
    fetchWorkflowBindings,
    createWorkflowBinding,
    deleteWorkflowBinding,
    fetchWorkflowTriggers,
    enrollWorkflowTargets,
    fetchWorkflowEnrollments,
    unenrollWorkflowTargets,
    fetchWorkflowRuns,
    fetchWorkflowRun,
    createWorkflowRuns,
    updateWorkflowRunStatus,
    fetchWorkflowRunEvents,
    completeWorkflowStep,
    submitWorkflowStepInput
  };
};
