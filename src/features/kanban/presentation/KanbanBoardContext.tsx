import React, { createContext, useContext, useReducer } from 'react';

import projectReducer from '../../../reducer/projectReducer';
import {
  kanbanInitialState,
  useKanbanProviderSupport
} from './useKanbanProviderSupport';
import { useKanbanProviderValue } from './useKanbanProviderValue';
import { useKanbanPresentationSlices } from './useKanbanPresentationSlices';

type KanbanBoardProviderProps = {
  children: React.ReactNode;
};

const KanbanBoardContext = createContext(null as any);

const KanbanBoardProvider = ({ children }: KanbanBoardProviderProps) => {
  const [state, dispatch] = useReducer(projectReducer, kanbanInitialState);

  const support = useKanbanProviderSupport();

  const {
    boardItems,
    columnsPresentation,
    projectsPresentation,
    taskCommentsPresentation,
    taskMutationPresentation,
    dragPresentation
  } = useKanbanPresentationSlices({
    state,
    dispatch,
    support
  });

  const contextValue = useKanbanProviderValue({
    state,
    support,
    boardItems,
    columnsPresentation,
    projectsPresentation,
    taskCommentsPresentation,
    taskMutationPresentation,
    dragPresentation,
    dispatch
  });

  return (
    <KanbanBoardContext.Provider value={contextValue}>
      {children}
    </KanbanBoardContext.Provider>
  );
};

export const useKanbanBoardContext = () => {
  const context = useContext(KanbanBoardContext);
  if (context === null) {
    throw new Error(
      'useKanbanBoardContext must be used within a KanbanBoardProvider'
    );
  }
  return context;
};

export { KanbanBoardContext, KanbanBoardProvider };
