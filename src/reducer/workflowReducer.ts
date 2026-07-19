import {
  WORKFLOW_SET_SELECTED_MEMBERS,
  WORKFLOW_TOGGLE_MEMBER,
  WORKFLOW_TOGGLE_MEMBERS,
  WORKFLOW_CLEAR_SELECTION,
  WORKFLOW_SET_TEMPLATE,
  WORKFLOW_SET_NAME,
  WORKFLOW_SET_GOAL,
  WORKFLOW_START,
  WORKFLOW_SET_SELECTED_NODE,
  WORKFLOW_UPDATE_NODE_FIELD,
  WORKFLOW_SET_NEW_NODE_FIELD,
  WORKFLOW_ADD_NODE,
  WORKFLOW_ADD_BRANCH,
  WORKFLOW_INSERT_AFTER,
  WORKFLOW_UPDATE_EDGE_LABEL,
  WORKFLOW_DELETE_NODE,
  WORKFLOW_TEMPLATES_REQUEST,
  WORKFLOW_TEMPLATES_SUCCESS,
  WORKFLOW_TEMPLATES_FAILURE,
  WORKFLOW_TEMPLATE_REQUEST,
  WORKFLOW_TEMPLATE_SUCCESS,
  WORKFLOW_TEMPLATE_FAILURE,
  WORKFLOW_TEMPLATE_CREATE_REQUEST,
  WORKFLOW_TEMPLATE_CREATE_SUCCESS,
  WORKFLOW_TEMPLATE_CREATE_FAILURE,
  WORKFLOW_LIST_REQUEST,
  WORKFLOW_LIST_SUCCESS,
  WORKFLOW_LIST_FAILURE,
  WORKFLOW_DETAIL_REQUEST,
  WORKFLOW_DETAIL_SUCCESS,
  WORKFLOW_DETAIL_FAILURE,
  WORKFLOW_CREATE_REQUEST,
  WORKFLOW_CREATE_SUCCESS,
  WORKFLOW_CREATE_FAILURE,
  WORKFLOW_UPDATE_REQUEST,
  WORKFLOW_UPDATE_SUCCESS,
  WORKFLOW_UPDATE_FAILURE,
  WORKFLOW_PUBLISH_REQUEST,
  WORKFLOW_PUBLISH_SUCCESS,
  WORKFLOW_PUBLISH_FAILURE,
  WORKFLOW_ARCHIVE_REQUEST,
  WORKFLOW_ARCHIVE_SUCCESS,
  WORKFLOW_ARCHIVE_FAILURE,
  WORKFLOW_CLONE_REQUEST,
  WORKFLOW_CLONE_SUCCESS,
  WORKFLOW_CLONE_FAILURE,
  WORKFLOW_VALIDATE_REQUEST,
  WORKFLOW_VALIDATE_SUCCESS,
  WORKFLOW_VALIDATE_FAILURE,
  WORKFLOW_BINDINGS_REQUEST,
  WORKFLOW_BINDINGS_SUCCESS,
  WORKFLOW_BINDINGS_FAILURE,
  WORKFLOW_BINDING_CREATE_REQUEST,
  WORKFLOW_BINDING_CREATE_SUCCESS,
  WORKFLOW_BINDING_CREATE_FAILURE,
  WORKFLOW_BINDING_DELETE_REQUEST,
  WORKFLOW_BINDING_DELETE_SUCCESS,
  WORKFLOW_BINDING_DELETE_FAILURE,
  WORKFLOW_TRIGGERS_REQUEST,
  WORKFLOW_TRIGGERS_SUCCESS,
  WORKFLOW_TRIGGERS_FAILURE,
  WORKFLOW_ENROLL_REQUEST,
  WORKFLOW_ENROLL_SUCCESS,
  WORKFLOW_ENROLL_FAILURE,
  WORKFLOW_ENROLLMENTS_REQUEST,
  WORKFLOW_ENROLLMENTS_SUCCESS,
  WORKFLOW_ENROLLMENTS_FAILURE,
  WORKFLOW_UNENROLL_REQUEST,
  WORKFLOW_UNENROLL_SUCCESS,
  WORKFLOW_UNENROLL_FAILURE,
  WORKFLOW_RUNS_REQUEST,
  WORKFLOW_RUNS_SUCCESS,
  WORKFLOW_RUNS_FAILURE,
  WORKFLOW_RUN_REQUEST,
  WORKFLOW_RUN_SUCCESS,
  WORKFLOW_RUN_FAILURE,
  WORKFLOW_RUN_CREATE_REQUEST,
  WORKFLOW_RUN_CREATE_SUCCESS,
  WORKFLOW_RUN_CREATE_FAILURE,
  WORKFLOW_RUN_ACTION_REQUEST,
  WORKFLOW_RUN_ACTION_SUCCESS,
  WORKFLOW_RUN_ACTION_FAILURE,
  WORKFLOW_RUN_EVENTS_REQUEST,
  WORKFLOW_RUN_EVENTS_SUCCESS,
  WORKFLOW_RUN_EVENTS_FAILURE,
  WORKFLOW_STEP_COMPLETE_REQUEST,
  WORKFLOW_STEP_COMPLETE_SUCCESS,
  WORKFLOW_STEP_COMPLETE_FAILURE,
  WORKFLOW_STEP_INPUT_REQUEST,
  WORKFLOW_STEP_INPUT_SUCCESS,
  WORKFLOW_STEP_INPUT_FAILURE,
  WORKFLOW_CLEAR_ERROR
} from '../types/workflow';
import type {
  WorkflowAction,
  WorkflowEdge,
  WorkflowNode,
  WorkflowState,
  WorkflowTemplate
} from '../types/workflow';

const WORKFLOW_GOALS = [
  { id: 'campaign', label: 'Campaign' },
  { id: 'event', label: 'Event' },
  { id: 'sponsorship', label: 'Sponsorship' }
];

// Local template gallery stubs were removed: the backend WorkflowTemplate
// catalog is the single source of truth for the picker (see
// useWorkflowProviderSupport.mergeTemplates). Keeping stale local copies here
// silently shadowed the backend graphs in the canvas — picking a template
// hydrated a non-publishable stub. The picker now renders backend templates
// only; DEFAULT_WORKFLOW_TEMPLATE below is the blank canvas for 'Custom'.
const WORKFLOW_TEMPLATE_DEFINITIONS: any[] = [];

const WORKFLOW_NODE_TYPES = [
  { id: 'start', label: 'Start' },
  { id: 'end', label: 'End' },
  { id: 'message', label: 'Send Message' },
  { id: 'data_request', label: 'Data Request' },
  { id: 'decision', label: 'Decision' },
  { id: 'task', label: 'Create Task' },
  { id: 'ai', label: 'AI Agent' },
  { id: 'assign', label: 'Assign' },
  { id: 'wait', label: 'Wait / Delay' },
  { id: 'webhook', label: 'Webhook' }
];

const WORKFLOW_HELPER_COPY = {
  start: 'This is the entry point for the workflow.',
  end: 'This step closes out the workflow.',
  message: 'Send a notification, email, or in-app message to the contact.',
  data_request:
    'Collect structured data or wait for a response before continuing.',
  decision: 'Branch the workflow based on a condition or response.',
  task: 'Create a task in a project and optionally assign it.',
  ai: 'Use an AI agent to analyze, personalize, or generate content.',
  assign: 'Assign the contact to a team member or role.',
  wait: 'Pause the workflow for a set duration or until a specific date.',
  webhook: 'Call an external URL with workflow data.'
};

const DEFAULT_NEW_NODE_DRAFT = {
  title: '',
  subtitle: '',
  tone: 'message',
  mode: 'single',
  splitYesTone: 'message',
  splitYesTitle: 'Yes step',
  splitYesSubtitle: '',
  splitYesLabel: 'Yes',
  splitNoTone: 'message',
  splitNoTitle: 'No step',
  splitNoSubtitle: '',
  splitNoLabel: 'No'
};

const DEFAULT_WORKFLOW_TEMPLATE = {
  id: 'custom',
  label: 'Custom workflow',
  description: 'Start from a blank canvas and add your own steps.',
  nodes: [
    {
      id: 'start',
      type: 'start',
      tone: 'start',
      title: 'Start',
      subtitle: 'Entry point',
      config: {}
    },
    {
      id: 'end',
      type: 'end',
      tone: 'end',
      title: 'End',
      subtitle: 'Exit workflow',
      config: {}
    }
  ],
  edges: [{ id: 'edge-start-end', from: 'start', to: 'end', label: null }]
};

const buildMemberSelectionKey = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return null;
};

const buildSelectedMemberIds = (keys = []) => {
  if (!Array.isArray(keys)) return {};
  return keys.reduce((acc, key) => {
    const normalized = buildMemberSelectionKey(key);
    if (!normalized) return acc;
    acc[normalized] = true;
    return acc;
  }, {});
};

const normalizeSelectedMemberIds = (value) => {
  if (!value) return {};
  if (Array.isArray(value)) return buildSelectedMemberIds(value);
  if (typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      if (value[key]) acc[String(key)] = true;
      return acc;
    }, {});
  }
  return {};
};

const buildNodeId = (nodes = [], tone = 'node') => {
  const existingIds = new Set(nodes.map((node) => node.id));
  let index = nodes.length + 1;
  let candidate = `${tone}-${index}`;
  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `${tone}-${index}`;
  }
  return candidate;
};

const buildEdgeId = (edges = [], from, to) => {
  const existingIds = new Set(edges.map((edge) => edge.id));
  const base = `${from}-${to}`;
  let index = 0;
  let candidate = base;
  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`;
  }
  return candidate;
};

const createListState = () => ({
  items: [],
  loading: false,
  error: null,
  fetchedAt: 0
});

const createDetailState = () => ({
  item: null,
  loading: false,
  error: null,
  fetchedAt: 0
});

const createMapListState = () => ({
  items: [],
  loading: false,
  error: null,
  fetchedAt: 0
});

const upsertItem = (collection, item) => {
  if (!item || !item.id) return collection;
  const index = collection.findIndex((entry) => entry.id === item.id);
  if (index === -1) {
    return [...collection, item];
  }
  const updated = [...collection];
  updated[index] = { ...updated[index], ...item };
  return updated;
};

const removeItem = (collection, itemId) =>
  collection.filter((entry) => entry.id !== itemId);

const mapById = (items = []) =>
  items.reduce((acc, item) => {
    if (item?.id) acc[item.id] = item;
    return acc;
  }, {});

const mergeById = (current, items = []) => ({
  ...current,
  ...mapById(items)
});

const ensureMapState = (currentMap, key) => {
  if (!key) return createMapListState();
  return currentMap[key] || createMapListState();
};

const workflowInitialState: WorkflowState = {
  selectedMemberIds: {},
  templateId: '',
  workflowName: '',
  workflowGoal: '',
  lastStarted: null,
  graphNodes: [],
  graphEdges: [],
  selectedNodeId: null,
  newNodeDraft: { ...DEFAULT_NEW_NODE_DRAFT },
  templates: createListState(),
  templatesById: {},
  templateDetail: createDetailState(),
  workflows: createListState(),
  workflowsById: {},
  workflowDetail: createDetailState(),
  bindings: createListState(),
  triggers: createListState(),
  enrollmentsByWorkflow: {},
  runsByWorkflow: {},
  runsById: {},
  runDetail: createDetailState(),
  runEventsByRun: {},
  validation: {
    loading: false,
    valid: null,
    errors: [],
    error: null
  },
  runQueue: {
    loading: false,
    runIds: [],
    error: null
  }
};

const workflowReducer = (
  state: WorkflowState,
  action: WorkflowAction
): WorkflowState => {
  const { type, payload } = action;

  switch (type) {
    case WORKFLOW_SET_SELECTED_MEMBERS:
      return {
        ...state,
        selectedMemberIds: normalizeSelectedMemberIds(payload)
      };
    case WORKFLOW_TOGGLE_MEMBER: {
      const key = payload;
      if (!key) return state;
      const next = { ...state.selectedMemberIds };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return {
        ...state,
        selectedMemberIds: next
      };
    }
    case WORKFLOW_TOGGLE_MEMBERS: {
      const { ids = [], select = true } = payload || {};
      if (!ids.length) return state;
      const next = { ...state.selectedMemberIds };
      ids.forEach((id) => {
        if (!id) return;
        if (select) {
          next[id] = true;
        } else {
          delete next[id];
        }
      });
      return {
        ...state,
        selectedMemberIds: next
      };
    }
    case WORKFLOW_CLEAR_SELECTION:
      if (!Object.keys(state.selectedMemberIds).length) return state;
      return {
        ...state,
        selectedMemberIds: {}
      };
    case WORKFLOW_SET_TEMPLATE: {
      const { templateId, nodes, edges } = payload || {};
      // Normalize nodes: ensure every node has `tone` (templates use `type`)
      const rawNodes = Array.isArray(nodes) ? nodes : state.graphNodes;
      const resolvedNodes = rawNodes.map((node: any) => ({
        ...node,
        tone: node.tone || node.type || 'action',
        // Saved workflows persist the display name under `label`; templates use
        // `title`. Accept either so an edited workflow shows real node names.
        title: node.title || node.label || node.subtitle || node.type || 'Step'
      }));
      const resolvedEdges = Array.isArray(edges) ? edges : state.graphEdges;
      return {
        ...state,
        templateId: templateId || state.templateId,
        graphNodes: resolvedNodes,
        graphEdges: resolvedEdges,
        selectedNodeId: resolvedNodes[0]?.id || null,
        newNodeDraft: { ...DEFAULT_NEW_NODE_DRAFT }
      };
    }
    case WORKFLOW_SET_NAME:
      return {
        ...state,
        workflowName: payload ?? ''
      };
    case WORKFLOW_SET_GOAL:
      return {
        ...state,
        workflowGoal: payload ?? state.workflowGoal
      };
    case WORKFLOW_START:
      return {
        ...state,
        lastStarted: payload
      };
    case WORKFLOW_SET_SELECTED_NODE:
      return {
        ...state,
        selectedNodeId: payload
      };
    case WORKFLOW_UPDATE_NODE_FIELD: {
      const { nodeId, field, value } = payload || {};
      if (!nodeId || !field) return state;
      const nextNodes = state.graphNodes.map((node) =>
        node.id === nodeId ? { ...node, [field]: value } : node
      );
      return {
        ...state,
        graphNodes: nextNodes
      };
    }
    case WORKFLOW_SET_NEW_NODE_FIELD: {
      const { field, value } = payload || {};
      if (!field) return state;
      return {
        ...state,
        newNodeDraft: {
          ...state.newNodeDraft,
          [field]: value
        }
      };
    }
    case WORKFLOW_ADD_NODE: {
      const { parentId, draft } = payload || {};
      const parentNode = state.graphNodes.find((node) => node.id === parentId);
      if (!parentNode) return state;
      if (parentNode.tone === 'end') return state;
      const hasChildren = state.graphEdges.some(
        (edge) => edge.from === parentId
      );
      if (hasChildren) return state;
      const resolvedDraft = draft || state.newNodeDraft;
      if (resolvedDraft.mode === 'split') {
        const nextNodes = [...state.graphNodes];
        const nextEdges = [...state.graphEdges];
        const yesTone = resolvedDraft.splitYesTone || 'message';
        const noTone = resolvedDraft.splitNoTone || 'message';
        const yesNodeId = buildNodeId(nextNodes, yesTone);
        nextNodes.push({
          id: yesNodeId,
          title: resolvedDraft.splitYesTitle?.trim() || 'Yes step',
          subtitle: resolvedDraft.splitYesSubtitle?.trim() || '',
          tone: yesTone
        });
        const noNodeId = buildNodeId(nextNodes, noTone);
        nextNodes.push({
          id: noNodeId,
          title: resolvedDraft.splitNoTitle?.trim() || 'No step',
          subtitle: resolvedDraft.splitNoSubtitle?.trim() || '',
          tone: noTone
        });
        nextEdges.push(
          {
            id: buildEdgeId(nextEdges, parentId, yesNodeId),
            from: parentId,
            to: yesNodeId,
            label: resolvedDraft.splitYesLabel?.trim() || 'Yes'
          },
          {
            id: buildEdgeId(nextEdges, parentId, noNodeId),
            from: parentId,
            to: noNodeId,
            label: resolvedDraft.splitNoLabel?.trim() || 'No'
          }
        );
        return {
          ...state,
          graphNodes: nextNodes,
          graphEdges: nextEdges,
          selectedNodeId: yesNodeId,
          newNodeDraft: { ...DEFAULT_NEW_NODE_DRAFT }
        };
      }
      const nodeId = buildNodeId(state.graphNodes, resolvedDraft.tone);
      const nextNodes = [
        ...state.graphNodes,
        {
          id: nodeId,
          title: resolvedDraft.title?.trim() || 'New step',
          subtitle: resolvedDraft.subtitle?.trim() || '',
          tone: resolvedDraft.tone || 'message'
        }
      ];
      const nextEdges = [
        ...state.graphEdges,
        {
          id: buildEdgeId(state.graphEdges, parentId, nodeId),
          from: parentId,
          to: nodeId,
          label: null
        }
      ];
      return {
        ...state,
        graphNodes: nextNodes,
        graphEdges: nextEdges,
        selectedNodeId: nodeId,
        newNodeDraft: { ...DEFAULT_NEW_NODE_DRAFT }
      };
    }
    case WORKFLOW_ADD_BRANCH: {
      // Append ONE more labelled branch (child + edge) to a node that already
      // has children — this is what makes a node fan out to 3+ branches (the
      // builder's split only ever made 2). Used for decision / switch nodes.
      const { parentId, label, tone, title } = payload || {};
      const parentNode = state.graphNodes.find((node) => node.id === parentId);
      if (!parentNode || parentNode.tone === 'end') return state;
      const branchTone = tone || 'message';
      const newId = buildNodeId(state.graphNodes, branchTone);
      const siblingCount = state.graphEdges.filter(
        (edge) => edge.from === parentId
      ).length;
      const nextNodes = [
        ...state.graphNodes,
        {
          id: newId,
          title: (title || '').trim() || 'Branch step',
          subtitle: '',
          tone: branchTone
        }
      ];
      const nextEdges = [
        ...state.graphEdges,
        {
          id: buildEdgeId(state.graphEdges, parentId, newId),
          from: parentId,
          to: newId,
          label: (label || '').trim() || `Branch ${siblingCount + 1}`
        }
      ];
      return {
        ...state,
        graphNodes: nextNodes,
        graphEdges: nextEdges,
        selectedNodeId: newId
      };
    }
    case WORKFLOW_INSERT_AFTER: {
      // The universal "+" insert. Clicking "+" on a node adds a step at that
      // position. Behaviour depends on the PARENT's type, not just edge count:
      //  • branch node (switch/decision/condition/wait_until) -> ALWAYS fan out
      //    a new labelled branch, even from the first "+", so a switch's cases
      //    each hang directly off it instead of chaining linearly.
      //  • plain leaf (no outgoing edge)  -> append  parent -> new
      //  • plain linear (one outgoing)    -> splice  parent -> new -> (old child),
      //    preserving the old edge's label so a branch's downstream is kept
      //  • anything already with 2+ outgoing -> add a new labelled branch
      const { parentId, draft } = payload || {};
      const parentNode = state.graphNodes.find((node) => node.id === parentId);
      if (!parentNode || parentNode.tone === 'end') return state;
      const d = draft || state.newNodeDraft;
      const tone = d.tone || 'message';
      const newId = buildNodeId(state.graphNodes, tone);
      const newNode = {
        id: newId,
        title: (d.title || '').trim() || 'New step',
        subtitle: (d.subtitle || '').trim() || '',
        tone,
        config: d.config || {}
      };
      const outgoing = state.graphEdges.filter((e) => e.from === parentId);
      const BRANCH_TONES = ['switch', 'decision', 'condition', 'wait_until'];
      const isBranchParent = BRANCH_TONES.includes(parentNode.tone);
      let nextEdges;
      if (isBranchParent || outgoing.length >= 2) {
        // Fan out a new labelled branch off the (branch) parent. Number by the
        // count of EXISTING labelled branches (+1) so an unlabelled fall-through
        // edge — e.g. the switch->end inherited when the node was spliced in —
        // doesn't push the first real case to "Case 2".
        const n = outgoing.filter((e) => e.label).length + 1;
        const branchLabel =
          parentNode.tone === 'switch' ? `Case ${n}` : `Branch ${n}`;
        nextEdges = [
          ...state.graphEdges,
          {
            id: buildEdgeId(state.graphEdges, parentId, newId),
            from: parentId,
            to: newId,
            label: branchLabel
          }
        ];
      } else if (outgoing.length === 0) {
        nextEdges = [
          ...state.graphEdges,
          {
            id: buildEdgeId(state.graphEdges, parentId, newId),
            from: parentId,
            to: newId,
            label: null
          }
        ];
      } else {
        const childEdge = outgoing[0];
        // re-point the existing edge to start at the new node (new -> oldChild),
        // keeping its label; then connect parent -> new.
        const repointed = state.graphEdges.map((e) =>
          e.id === childEdge.id ? { ...e, from: newId } : e
        );
        nextEdges = [
          ...repointed,
          {
            id: buildEdgeId(repointed, parentId, newId),
            from: parentId,
            to: newId,
            label: null
          }
        ];
      }
      // For a branch parent, keep the PARENT selected so the realtime picker's
      // next pick adds another branch off it (a switch's cases all hang off the
      // switch) instead of chaining linearly onto the just-added branch. For
      // plain append/splice, follow the new node so linear builds keep flowing.
      const branchInsert = isBranchParent || outgoing.length >= 2;
      return {
        ...state,
        graphNodes: [...state.graphNodes, newNode],
        graphEdges: nextEdges,
        selectedNodeId: branchInsert ? parentId : newId,
        newNodeDraft: { ...DEFAULT_NEW_NODE_DRAFT }
      };
    }
    case WORKFLOW_UPDATE_EDGE_LABEL: {
      const { edgeId, label } = payload || {};
      if (!edgeId) return state;
      return {
        ...state,
        graphEdges: state.graphEdges.map((edge) =>
          edge.id === edgeId ? { ...edge, label } : edge
        )
      };
    }
    case WORKFLOW_DELETE_NODE: {
      // Remove ONLY the clicked node, not its descendants. Re-link the node's
      // parent(s) to its child(ren) so the rest of the flow stays connected:
      //   parent -> [node] -> child   becomes   parent -> child
      // The incoming edge's label (a branch arm) wins over the outgoing one so
      // a branch's labelling is preserved when a step inside it is removed.
      const { nodeId } = payload || {};
      if (!nodeId) return state;
      const targetNode = state.graphNodes.find((node) => node.id === nodeId);
      if (!targetNode || targetNode.tone === 'start') return state;

      const incoming = state.graphEdges.filter((edge) => edge.to === nodeId);
      const outgoing = state.graphEdges.filter((edge) => edge.from === nodeId);
      const remaining = state.graphEdges.filter(
        (edge) => edge.from !== nodeId && edge.to !== nodeId
      );

      const bridges = [];
      incoming.forEach((parentEdge) => {
        outgoing.forEach((childEdge) => {
          if (parentEdge.from === childEdge.to) return; // no self-loop
          const duplicate =
            remaining.some(
              (e) => e.from === parentEdge.from && e.to === childEdge.to
            ) ||
            bridges.some(
              (e) => e.from === parentEdge.from && e.to === childEdge.to
            );
          if (duplicate) return;
          bridges.push({
            id: buildEdgeId(
              [...remaining, ...bridges],
              parentEdge.from,
              childEdge.to
            ),
            from: parentEdge.from,
            to: childEdge.to,
            label: parentEdge.label ?? childEdge.label ?? null
          });
        });
      });

      const nextEdges = [...remaining, ...bridges];
      const nextNodes = state.graphNodes.filter((node) => node.id !== nodeId);
      // Select the parent (nicer than dropping to nothing) when we removed the
      // currently-selected node.
      const nextSelectedNodeId =
        state.selectedNodeId === nodeId
          ? incoming[0]?.from ?? null
          : state.selectedNodeId;

      return {
        ...state,
        graphNodes: nextNodes,
        graphEdges: nextEdges,
        selectedNodeId: nextSelectedNodeId
      };
    }

    case WORKFLOW_TEMPLATES_REQUEST:
      return {
        ...state,
        templates: {
          ...state.templates,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_TEMPLATES_SUCCESS:
      return {
        ...state,
        templates: {
          items: Array.isArray(payload) ? payload : [],
          loading: false,
          error: null,
          fetchedAt: Date.now()
        },
        templatesById: mergeById(state.templatesById, payload)
      };
    case WORKFLOW_TEMPLATES_FAILURE:
      return {
        ...state,
        templates: {
          ...state.templates,
          loading: false,
          error: payload || 'Unable to load workflow templates.'
        }
      };
    case WORKFLOW_TEMPLATE_REQUEST:
      return {
        ...state,
        templateDetail: {
          ...state.templateDetail,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_TEMPLATE_SUCCESS: {
      const template = payload || null;
      return {
        ...state,
        templateDetail: {
          item: template,
          loading: false,
          error: null,
          fetchedAt: Date.now()
        },
        templatesById: template?.id
          ? { ...state.templatesById, [template.id]: template }
          : state.templatesById,
        templates: template
          ? {
              ...state.templates,
              items: upsertItem(state.templates.items, template)
            }
          : state.templates
      };
    }
    case WORKFLOW_TEMPLATE_FAILURE:
      return {
        ...state,
        templateDetail: {
          ...state.templateDetail,
          loading: false,
          error: payload || 'Unable to load workflow template.'
        }
      };
    case WORKFLOW_TEMPLATE_CREATE_REQUEST:
      return {
        ...state,
        templates: {
          ...state.templates,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_TEMPLATE_CREATE_SUCCESS: {
      const template = payload || null;
      return {
        ...state,
        templates: {
          ...state.templates,
          items: template
            ? upsertItem(state.templates.items, template)
            : state.templates.items,
          loading: false,
          error: null,
          fetchedAt: Date.now()
        },
        templatesById: template?.id
          ? { ...state.templatesById, [template.id]: template }
          : state.templatesById
      };
    }
    case WORKFLOW_TEMPLATE_CREATE_FAILURE:
      return {
        ...state,
        templates: {
          ...state.templates,
          loading: false,
          error: payload || 'Unable to create workflow template.'
        }
      };

    case WORKFLOW_LIST_REQUEST:
      return {
        ...state,
        workflows: {
          ...state.workflows,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_LIST_SUCCESS:
      return {
        ...state,
        workflows: {
          items: Array.isArray(payload) ? payload : [],
          loading: false,
          error: null,
          fetchedAt: Date.now()
        },
        workflowsById: mergeById(state.workflowsById, payload)
      };
    case WORKFLOW_LIST_FAILURE:
      return {
        ...state,
        workflows: {
          ...state.workflows,
          loading: false,
          error: payload || 'Unable to load workflows.'
        }
      };
    case WORKFLOW_DETAIL_REQUEST:
      return {
        ...state,
        workflowDetail: {
          ...state.workflowDetail,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_DETAIL_SUCCESS: {
      const workflow = payload || null;
      return {
        ...state,
        workflowDetail: {
          item: workflow,
          loading: false,
          error: null,
          fetchedAt: Date.now()
        },
        workflowsById: workflow?.id
          ? { ...state.workflowsById, [workflow.id]: workflow }
          : state.workflowsById,
        workflows: workflow
          ? {
              ...state.workflows,
              items: upsertItem(state.workflows.items, workflow)
            }
          : state.workflows
      };
    }
    case WORKFLOW_DETAIL_FAILURE:
      return {
        ...state,
        workflowDetail: {
          ...state.workflowDetail,
          loading: false,
          error: payload || 'Unable to load workflow.'
        }
      };
    case WORKFLOW_CREATE_REQUEST:
      return {
        ...state,
        workflows: {
          ...state.workflows,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_CREATE_SUCCESS: {
      const workflow = payload || null;
      return {
        ...state,
        workflows: {
          ...state.workflows,
          items: workflow
            ? upsertItem(state.workflows.items, workflow)
            : state.workflows.items,
          loading: false,
          error: null,
          fetchedAt: Date.now()
        },
        workflowsById: workflow?.id
          ? { ...state.workflowsById, [workflow.id]: workflow }
          : state.workflowsById
      };
    }
    case WORKFLOW_CREATE_FAILURE:
      return {
        ...state,
        workflows: {
          ...state.workflows,
          loading: false,
          error: payload || 'Unable to create workflow.'
        }
      };
    case WORKFLOW_UPDATE_REQUEST:
    case WORKFLOW_PUBLISH_REQUEST:
    case WORKFLOW_ARCHIVE_REQUEST:
    case WORKFLOW_CLONE_REQUEST:
      return {
        ...state,
        workflowDetail: {
          ...state.workflowDetail,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_UPDATE_SUCCESS:
    case WORKFLOW_PUBLISH_SUCCESS:
    case WORKFLOW_ARCHIVE_SUCCESS:
    case WORKFLOW_CLONE_SUCCESS: {
      const workflow = payload || null;
      return {
        ...state,
        workflowDetail: {
          item: workflow,
          loading: false,
          error: null,
          fetchedAt: Date.now()
        },
        workflowsById: workflow?.id
          ? { ...state.workflowsById, [workflow.id]: workflow }
          : state.workflowsById,
        workflows: workflow
          ? {
              ...state.workflows,
              items: upsertItem(state.workflows.items, workflow)
            }
          : state.workflows
      };
    }
    case WORKFLOW_UPDATE_FAILURE:
    case WORKFLOW_PUBLISH_FAILURE:
    case WORKFLOW_ARCHIVE_FAILURE:
    case WORKFLOW_CLONE_FAILURE:
      return {
        ...state,
        workflowDetail: {
          ...state.workflowDetail,
          loading: false,
          error: payload || 'Unable to update workflow.'
        }
      };

    case WORKFLOW_VALIDATE_REQUEST:
      return {
        ...state,
        validation: {
          ...state.validation,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_VALIDATE_SUCCESS:
      return {
        ...state,
        validation: {
          loading: false,
          valid: payload?.valid ?? false,
          errors: payload?.errors || [],
          error: null
        }
      };
    case WORKFLOW_VALIDATE_FAILURE:
      return {
        ...state,
        validation: {
          ...state.validation,
          loading: false,
          error: payload || 'Unable to validate workflow.'
        }
      };

    case WORKFLOW_BINDINGS_REQUEST:
      return {
        ...state,
        bindings: {
          ...state.bindings,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_BINDINGS_SUCCESS:
      return {
        ...state,
        bindings: {
          items: Array.isArray(payload) ? payload : [],
          loading: false,
          error: null,
          fetchedAt: Date.now()
        }
      };
    case WORKFLOW_BINDINGS_FAILURE:
      return {
        ...state,
        bindings: {
          ...state.bindings,
          loading: false,
          error: payload || 'Unable to load workflow bindings.'
        }
      };
    case WORKFLOW_BINDING_CREATE_REQUEST:
      return {
        ...state,
        bindings: {
          ...state.bindings,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_BINDING_CREATE_SUCCESS:
      return {
        ...state,
        bindings: {
          ...state.bindings,
          items: payload
            ? upsertItem(state.bindings.items, payload)
            : state.bindings.items,
          loading: false,
          error: null,
          fetchedAt: Date.now()
        }
      };
    case WORKFLOW_BINDING_CREATE_FAILURE:
      return {
        ...state,
        bindings: {
          ...state.bindings,
          loading: false,
          error: payload || 'Unable to create workflow binding.'
        }
      };
    case WORKFLOW_BINDING_DELETE_REQUEST:
      return {
        ...state,
        bindings: {
          ...state.bindings,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_BINDING_DELETE_SUCCESS:
      return {
        ...state,
        bindings: {
          ...state.bindings,
          items: removeItem(state.bindings.items, payload),
          loading: false,
          error: null,
          fetchedAt: Date.now()
        }
      };
    case WORKFLOW_BINDING_DELETE_FAILURE:
      return {
        ...state,
        bindings: {
          ...state.bindings,
          loading: false,
          error: payload || 'Unable to delete workflow binding.'
        }
      };

    case WORKFLOW_TRIGGERS_REQUEST:
      return {
        ...state,
        triggers: {
          ...state.triggers,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_TRIGGERS_SUCCESS:
      return {
        ...state,
        triggers: {
          items: Array.isArray(payload) ? payload : [],
          loading: false,
          error: null,
          fetchedAt: Date.now()
        }
      };
    case WORKFLOW_TRIGGERS_FAILURE:
      return {
        ...state,
        triggers: {
          ...state.triggers,
          loading: false,
          error: payload || 'Unable to load workflow triggers.'
        }
      };

    case WORKFLOW_ENROLL_REQUEST: {
      const workflowId = payload?.workflowId;
      if (!workflowId) return state;
      const existing = ensureMapState(state.enrollmentsByWorkflow, workflowId);
      return {
        ...state,
        enrollmentsByWorkflow: {
          ...state.enrollmentsByWorkflow,
          [workflowId]: {
            ...existing,
            loading: true,
            error: null
          }
        }
      };
    }
    case WORKFLOW_ENROLL_SUCCESS: {
      const { workflowId, enrollments } = payload || {};
      if (!workflowId) return state;
      const existing = ensureMapState(state.enrollmentsByWorkflow, workflowId);
      const items = Array.isArray(enrollments) ? enrollments : existing.items;
      return {
        ...state,
        enrollmentsByWorkflow: {
          ...state.enrollmentsByWorkflow,
          [workflowId]: {
            items,
            loading: false,
            error: null,
            fetchedAt: Date.now()
          }
        }
      };
    }
    case WORKFLOW_ENROLL_FAILURE: {
      const { workflowId, error } = payload || {};
      if (!workflowId) return state;
      const existing = ensureMapState(state.enrollmentsByWorkflow, workflowId);
      return {
        ...state,
        enrollmentsByWorkflow: {
          ...state.enrollmentsByWorkflow,
          [workflowId]: {
            ...existing,
            loading: false,
            error: error || 'Unable to enroll workflow targets.'
          }
        }
      };
    }
    case WORKFLOW_ENROLLMENTS_REQUEST: {
      const workflowId = payload?.workflowId;
      if (!workflowId) return state;
      const existing = ensureMapState(state.enrollmentsByWorkflow, workflowId);
      return {
        ...state,
        enrollmentsByWorkflow: {
          ...state.enrollmentsByWorkflow,
          [workflowId]: {
            ...existing,
            loading: true,
            error: null
          }
        }
      };
    }
    case WORKFLOW_ENROLLMENTS_SUCCESS: {
      const { workflowId, enrollments } = payload || {};
      if (!workflowId) return state;
      return {
        ...state,
        enrollmentsByWorkflow: {
          ...state.enrollmentsByWorkflow,
          [workflowId]: {
            items: Array.isArray(enrollments) ? enrollments : [],
            loading: false,
            error: null,
            fetchedAt: Date.now()
          }
        }
      };
    }
    case WORKFLOW_ENROLLMENTS_FAILURE: {
      const { workflowId, error } = payload || {};
      if (!workflowId) return state;
      const existing = ensureMapState(state.enrollmentsByWorkflow, workflowId);
      return {
        ...state,
        enrollmentsByWorkflow: {
          ...state.enrollmentsByWorkflow,
          [workflowId]: {
            ...existing,
            loading: false,
            error: error || 'Unable to load enrollments.'
          }
        }
      };
    }
    case WORKFLOW_UNENROLL_REQUEST: {
      const workflowId = payload?.workflowId;
      if (!workflowId) return state;
      const existing = ensureMapState(state.enrollmentsByWorkflow, workflowId);
      return {
        ...state,
        enrollmentsByWorkflow: {
          ...state.enrollmentsByWorkflow,
          [workflowId]: {
            ...existing,
            loading: true,
            error: null
          }
        }
      };
    }
    case WORKFLOW_UNENROLL_SUCCESS: {
      const { workflowId, removedIds } = payload || {};
      if (!workflowId) return state;
      const existing = ensureMapState(state.enrollmentsByWorkflow, workflowId);
      const items = Array.isArray(removedIds)
        ? existing.items.filter((item) => !removedIds.includes(item.id))
        : existing.items;
      return {
        ...state,
        enrollmentsByWorkflow: {
          ...state.enrollmentsByWorkflow,
          [workflowId]: {
            ...existing,
            items,
            loading: false,
            error: null,
            fetchedAt: Date.now()
          }
        }
      };
    }
    case WORKFLOW_UNENROLL_FAILURE: {
      const { workflowId, error } = payload || {};
      if (!workflowId) return state;
      const existing = ensureMapState(state.enrollmentsByWorkflow, workflowId);
      return {
        ...state,
        enrollmentsByWorkflow: {
          ...state.enrollmentsByWorkflow,
          [workflowId]: {
            ...existing,
            loading: false,
            error: error || 'Unable to unenroll targets.'
          }
        }
      };
    }

    case WORKFLOW_RUNS_REQUEST: {
      const workflowId = payload?.workflowId;
      if (!workflowId) return state;
      const existing = ensureMapState(state.runsByWorkflow, workflowId);
      return {
        ...state,
        runsByWorkflow: {
          ...state.runsByWorkflow,
          [workflowId]: {
            ...existing,
            loading: true,
            error: null
          }
        }
      };
    }
    case WORKFLOW_RUNS_SUCCESS: {
      const { workflowId, runs } = payload || {};
      if (!workflowId) return state;
      return {
        ...state,
        runsByWorkflow: {
          ...state.runsByWorkflow,
          [workflowId]: {
            items: Array.isArray(runs) ? runs : [],
            loading: false,
            error: null,
            fetchedAt: Date.now()
          }
        },
        runsById: mergeById(state.runsById, runs)
      };
    }
    case WORKFLOW_RUNS_FAILURE: {
      const { workflowId, error } = payload || {};
      if (!workflowId) return state;
      const existing = ensureMapState(state.runsByWorkflow, workflowId);
      return {
        ...state,
        runsByWorkflow: {
          ...state.runsByWorkflow,
          [workflowId]: {
            ...existing,
            loading: false,
            error: error || 'Unable to load workflow runs.'
          }
        }
      };
    }
    case WORKFLOW_RUN_REQUEST:
      return {
        ...state,
        runDetail: {
          ...state.runDetail,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_RUN_SUCCESS: {
      const run = payload || null;
      return {
        ...state,
        runDetail: {
          item: run,
          loading: false,
          error: null,
          fetchedAt: Date.now()
        },
        runsById: run?.id
          ? { ...state.runsById, [run.id]: run }
          : state.runsById
      };
    }
    case WORKFLOW_RUN_FAILURE:
      return {
        ...state,
        runDetail: {
          ...state.runDetail,
          loading: false,
          error: payload || 'Unable to load workflow run.'
        }
      };
    case WORKFLOW_RUN_CREATE_REQUEST:
      return {
        ...state,
        runQueue: {
          ...state.runQueue,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_RUN_CREATE_SUCCESS:
      return {
        ...state,
        runQueue: {
          loading: false,
          runIds: payload?.runIds || [],
          error: null
        }
      };
    case WORKFLOW_RUN_CREATE_FAILURE:
      return {
        ...state,
        runQueue: {
          ...state.runQueue,
          loading: false,
          error: payload || 'Unable to create workflow run.'
        }
      };
    case WORKFLOW_RUN_ACTION_REQUEST:
      return {
        ...state,
        runDetail: {
          ...state.runDetail,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_RUN_ACTION_SUCCESS: {
      const run = payload || null;
      return {
        ...state,
        runDetail: {
          item: run,
          loading: false,
          error: null,
          fetchedAt: Date.now()
        },
        runsById: run?.id
          ? { ...state.runsById, [run.id]: run }
          : state.runsById
      };
    }
    case WORKFLOW_RUN_ACTION_FAILURE:
      return {
        ...state,
        runDetail: {
          ...state.runDetail,
          loading: false,
          error: payload || 'Unable to update workflow run.'
        }
      };
    case WORKFLOW_RUN_EVENTS_REQUEST: {
      const runId = payload?.runId;
      if (!runId) return state;
      const existing = ensureMapState(state.runEventsByRun, runId);
      return {
        ...state,
        runEventsByRun: {
          ...state.runEventsByRun,
          [runId]: {
            ...existing,
            loading: true,
            error: null
          }
        }
      };
    }
    case WORKFLOW_RUN_EVENTS_SUCCESS: {
      const { runId, events } = payload || {};
      if (!runId) return state;
      return {
        ...state,
        runEventsByRun: {
          ...state.runEventsByRun,
          [runId]: {
            items: Array.isArray(events) ? events : [],
            loading: false,
            error: null,
            fetchedAt: Date.now()
          }
        }
      };
    }
    case WORKFLOW_RUN_EVENTS_FAILURE: {
      const { runId, error } = payload || {};
      if (!runId) return state;
      const existing = ensureMapState(state.runEventsByRun, runId);
      return {
        ...state,
        runEventsByRun: {
          ...state.runEventsByRun,
          [runId]: {
            ...existing,
            loading: false,
            error: error || 'Unable to load run events.'
          }
        }
      };
    }
    case WORKFLOW_STEP_COMPLETE_REQUEST:
    case WORKFLOW_STEP_INPUT_REQUEST:
      return {
        ...state,
        runDetail: {
          ...state.runDetail,
          loading: true,
          error: null
        }
      };
    case WORKFLOW_STEP_COMPLETE_SUCCESS:
    case WORKFLOW_STEP_INPUT_SUCCESS: {
      const run = payload || null;
      return {
        ...state,
        runDetail: {
          item: run,
          loading: false,
          error: null,
          fetchedAt: Date.now()
        },
        runsById: run?.id
          ? { ...state.runsById, [run.id]: run }
          : state.runsById
      };
    }
    case WORKFLOW_STEP_COMPLETE_FAILURE:
    case WORKFLOW_STEP_INPUT_FAILURE:
      return {
        ...state,
        runDetail: {
          ...state.runDetail,
          loading: false,
          error: payload || 'Unable to update workflow step.'
        }
      };

    case WORKFLOW_CLEAR_ERROR:
      return {
        ...state,
        templates: { ...state.templates, error: null },
        templateDetail: { ...state.templateDetail, error: null },
        workflows: { ...state.workflows, error: null },
        workflowDetail: { ...state.workflowDetail, error: null },
        runDetail: { ...state.runDetail, error: null },
        bindings: { ...state.bindings, error: null },
        triggers: { ...state.triggers, error: null },
        validation: { ...state.validation, error: null },
        runQueue: { ...state.runQueue, error: null }
      };

    default:
      return state;
  }
};

export {
  workflowInitialState,
  WORKFLOW_GOALS,
  WORKFLOW_TEMPLATE_DEFINITIONS,
  WORKFLOW_NODE_TYPES,
  WORKFLOW_HELPER_COPY,
  DEFAULT_NEW_NODE_DRAFT,
  DEFAULT_WORKFLOW_TEMPLATE,
  normalizeSelectedMemberIds
};

export default workflowReducer;
