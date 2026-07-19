import { DEFAULT_WORKFLOW_TEMPLATE } from '../../../reducer/workflowReducer';
import {
  normalizeListResponse,
  normalizeRemovedIds,
  normalizeRunIds,
  normalizeRunPayload
} from '../../../domain/workflow/workflowNormalizers';
import { useWorkflowBuilderPresentation } from './useWorkflowBuilderPresentation';
import { useWorkflowOperationsPresentation } from './useWorkflowOperationsPresentation';

export const useWorkflowPresentationSlices = ({
  dispatch,
  state,
  support
}: {
  dispatch: any;
  state: any;
  support: any;
}) => {
  const builder = useWorkflowBuilderPresentation({
    dispatch,
    mergedTemplates: support.mergedTemplates,
    state,
    defaultWorkflowTemplate: DEFAULT_WORKFLOW_TEMPLATE
  });

  const operations = useWorkflowOperationsPresentation({
    dispatch,
    getErrorMessage: support.getErrorMessage,
    normalizeListResponse,
    normalizeRemovedIds,
    normalizeRunIds,
    normalizeRunPayload,
    state
  });

  return {
    builder,
    operations
  };
};
