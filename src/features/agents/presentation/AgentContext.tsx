import React, { createContext, useContext } from 'react';

import { agentInitialState, agentPollingConfig } from './agentContextConfig';
import { useAgentPresentationSlices } from './useAgentPresentationSlices';
import { useAgentProviderValue } from './useAgentProviderValue';
import { useAgentProviderSupport } from './useAgentProviderSupport';
import { useAgentUtilities } from './useAgentUtilities';

export {
  DEFAULT_AI_ALIAS,
  ensureAbsoluteUrl,
  extractDownloadUrl,
  extractPlainText,
  formatFileSize,
  makePossessive,
  normalizeApiPath,
  resolvePdfUrl
} from './agentUtilities';

type AgentProviderProps = {
  children: React.ReactNode;
};

const AgentContext = createContext(null as any);

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentContext must be used within an AgentProvider');
  }
  return context;
};

export const AgentProvider = ({ children }: AgentProviderProps) => {
  const support = useAgentProviderSupport({
    initialState: agentInitialState
  });

  const { execution, catalog } = useAgentPresentationSlices({
    support,
    polling: agentPollingConfig
  });

  const agentUtilities = useAgentUtilities();

  const value = useAgentProviderValue({
    activeSessions: support.activeSessions,
    availableAgents: support.availableAgents,
    isLoading: support.isLoading,
    execution,
    catalog,
    updateSession: support.updateSession,
    agentUtilities
  });

  return (
    <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
  );
};

export default AgentContext;
