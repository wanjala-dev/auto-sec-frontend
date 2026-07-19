import { useCallback } from 'react';
import {
  WORKFLOW_ADD_NODE,
  WORKFLOW_ADD_BRANCH,
  WORKFLOW_INSERT_AFTER,
  WORKFLOW_UPDATE_EDGE_LABEL,
  WORKFLOW_CLEAR_ERROR,
  WORKFLOW_CLEAR_SELECTION,
  WORKFLOW_DELETE_NODE,
  WORKFLOW_SET_GOAL,
  WORKFLOW_SET_NAME,
  WORKFLOW_SET_NEW_NODE_FIELD,
  WORKFLOW_SET_SELECTED_MEMBERS,
  WORKFLOW_SET_SELECTED_NODE,
  WORKFLOW_SET_TEMPLATE,
  WORKFLOW_START,
  WORKFLOW_TOGGLE_MEMBER,
  WORKFLOW_TOGGLE_MEMBERS,
  WORKFLOW_UPDATE_NODE_FIELD
} from '../../../types/workflow';

export const useWorkflowBuilderPresentation = ({
  dispatch,
  mergedTemplates,
  state,
  defaultWorkflowTemplate
}: {
  dispatch: any;
  mergedTemplates: any[];
  state: any;
  defaultWorkflowTemplate: any;
}) => {
  const setSelectedMembers = useCallback(
    (value) => {
      dispatch({
        type: WORKFLOW_SET_SELECTED_MEMBERS,
        payload: value
      });
    },
    [dispatch]
  );

  const toggleMember = useCallback(
    (key) => {
      dispatch({ type: WORKFLOW_TOGGLE_MEMBER, payload: key });
    },
    [dispatch]
  );

  const toggleMembers = useCallback(
    (payload) => {
      dispatch({ type: WORKFLOW_TOGGLE_MEMBERS, payload });
    },
    [dispatch]
  );

  const clearSelection = useCallback(() => {
    dispatch({ type: WORKFLOW_CLEAR_SELECTION });
  }, [dispatch]);

  const setWorkflowName = useCallback(
    (value) => {
      dispatch({ type: WORKFLOW_SET_NAME, payload: value });
    },
    [dispatch]
  );

  const setWorkflowGoal = useCallback(
    (value) => {
      dispatch({ type: WORKFLOW_SET_GOAL, payload: value });
    },
    [dispatch]
  );

  const setWorkflowTemplate = useCallback(
    (templateId) => {
      const template = mergedTemplates.find((item) => item.id === templateId);
      if (template) {
        dispatch({
          type: WORKFLOW_SET_TEMPLATE,
          payload: {
            templateId: template.id,
            nodes: template.nodes,
            edges: template.edges
          }
        });
      } else {
        dispatch({
          type: WORKFLOW_SET_TEMPLATE,
          payload: {
            templateId: templateId || defaultWorkflowTemplate.id,
            nodes: defaultWorkflowTemplate.nodes,
            edges: defaultWorkflowTemplate.edges
          }
        });
      }
    },
    [defaultWorkflowTemplate, dispatch, mergedTemplates]
  );

  // Hydrate the builder from an existing (loaded) workflow so it can be edited:
  // load its saved graph + name. Reuses SET_TEMPLATE (which normalizes
  // type->tone) for the graph, then SET_NAME for the title.
  const loadWorkflowIntoBuilder = useCallback(
    (workflow) => {
      if (!workflow) return;
      const graph = workflow.graph || {};
      dispatch({
        type: WORKFLOW_SET_TEMPLATE,
        payload: {
          templateId: workflow.template_id || 'custom',
          nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
          edges: Array.isArray(graph.edges) ? graph.edges : []
        }
      });
      dispatch({ type: WORKFLOW_SET_NAME, payload: workflow.name || '' });
      if (workflow.goal) {
        dispatch({ type: WORKFLOW_SET_GOAL, payload: workflow.goal });
      }
    },
    [dispatch]
  );

  const setSelectedNode = useCallback(
    (nodeId) => {
      dispatch({ type: WORKFLOW_SET_SELECTED_NODE, payload: nodeId });
    },
    [dispatch]
  );

  const updateNodeField = useCallback(
    (nodeId, field, value) => {
      if (!nodeId || !field) return;
      dispatch({
        type: WORKFLOW_UPDATE_NODE_FIELD,
        payload: { nodeId, field, value }
      });
    },
    [dispatch]
  );

  const setNewNodeField = useCallback(
    (field, value) => {
      if (!field) return;
      dispatch({
        type: WORKFLOW_SET_NEW_NODE_FIELD,
        payload: { field, value }
      });
    },
    [dispatch]
  );

  const addNode = useCallback(
    (parentId, draftOverride) => {
      if (!parentId) return;
      dispatch({
        type: WORKFLOW_ADD_NODE,
        payload: {
          parentId,
          draft: draftOverride ?? state.newNodeDraft
        }
      });
    },
    [dispatch, state.newNodeDraft]
  );

  const addBranch = useCallback(
    (
      parentId,
      {
        label,
        tone,
        title
      }: { label?: string; tone?: string; title?: string } = {}
    ) => {
      if (!parentId) return;
      dispatch({
        type: WORKFLOW_ADD_BRANCH,
        payload: { parentId, label, tone, title }
      });
    },
    [dispatch]
  );

  const insertAfter = useCallback(
    (parentId, draft) => {
      if (!parentId) return;
      dispatch({ type: WORKFLOW_INSERT_AFTER, payload: { parentId, draft } });
    },
    [dispatch]
  );

  const updateEdgeLabel = useCallback(
    (edgeId, label) => {
      if (!edgeId) return;
      dispatch({
        type: WORKFLOW_UPDATE_EDGE_LABEL,
        payload: { edgeId, label }
      });
    },
    [dispatch]
  );

  const deleteNode = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      dispatch({
        type: WORKFLOW_DELETE_NODE,
        payload: { nodeId }
      });
    },
    [dispatch]
  );

  const startWorkflow = useCallback(
    (count) => {
      if (!count) return;
      dispatch({
        type: WORKFLOW_START,
        payload: {
          at: new Date().toISOString(),
          count,
          templateId: state.templateId,
          goal: state.workflowGoal
        }
      });
    },
    [dispatch, state.templateId, state.workflowGoal]
  );

  const clearWorkflowErrors = useCallback(() => {
    dispatch({ type: WORKFLOW_CLEAR_ERROR });
  }, [dispatch]);

  return {
    setSelectedMembers,
    toggleMember,
    toggleMembers,
    clearSelection,
    setWorkflowName,
    setWorkflowGoal,
    setWorkflowTemplate,
    loadWorkflowIntoBuilder,
    setSelectedNode,
    updateNodeField,
    setNewNodeField,
    addNode,
    addBranch,
    insertAfter,
    updateEdgeLabel,
    deleteNode,
    startWorkflow,
    clearWorkflowErrors
  };
};
