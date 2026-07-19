import React, { createContext, useContext, useReducer } from 'react';

import workflowReducer, {
  workflowInitialState
} from '../../../reducer/workflowReducer';
import type { WorkflowContextValue } from '../../../types/workflow';
import { useWorkflowProviderSupport } from './useWorkflowProviderSupport';
import { useWorkflowPresentationSlices } from './useWorkflowPresentationSlices';
import { useWorkflowProviderValue } from './useWorkflowProviderValue';

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

const WorkflowProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(workflowReducer, workflowInitialState);
  const {
    getErrorMessage,
    mergedTemplates,
    workflowTemplateOptions,
    workflowTemplate
  } = useWorkflowProviderSupport({
    state
  });

  const { builder, operations } = useWorkflowPresentationSlices({
    dispatch,
    state,
    support: {
      getErrorMessage,
      mergedTemplates
    }
  });

  const contextValue = useWorkflowProviderValue({
    state,
    workflowTemplate,
    mergedTemplates,
    workflowTemplateOptions,
    builder,
    operations
  });

  return (
    <WorkflowContext.Provider value={contextValue}>
      {children}
    </WorkflowContext.Provider>
  );
};

const useWorkflowContext = (): WorkflowContextValue => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error(
      'useWorkflowContext must be used within a WorkflowProvider'
    );
  }
  return context;
};

export { WorkflowContext, WorkflowProvider, useWorkflowContext };
