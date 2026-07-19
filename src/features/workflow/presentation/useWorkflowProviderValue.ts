import { useMemo } from 'react';
import {
  WORKFLOW_GOALS,
  WORKFLOW_HELPER_COPY,
  WORKFLOW_NODE_TYPES
} from '../../../reducer/workflowReducer';

export const useWorkflowProviderValue = ({
  state,
  workflowTemplate,
  mergedTemplates,
  workflowTemplateOptions,
  builder,
  operations
}: {
  state: any;
  workflowTemplate: any;
  mergedTemplates: any;
  workflowTemplateOptions: any;
  builder: any;
  operations: any;
}) =>
  useMemo(
    () => ({
      workflowState: state,
      workflowTemplate,
      workflowTemplates: mergedTemplates,
      workflowTemplateOptions,
      workflowGoals: WORKFLOW_GOALS,
      workflowNodeTypes: WORKFLOW_NODE_TYPES,
      workflowHelperCopy: WORKFLOW_HELPER_COPY,
      ...builder,
      ...operations
    }),
    [
      state,
      workflowTemplate,
      mergedTemplates,
      workflowTemplateOptions,
      builder,
      operations
    ]
  );
