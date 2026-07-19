import { useAgentCatalogPresentation } from './useAgentCatalogPresentation';
import { useAgentExecutionPresentation } from './useAgentExecutionPresentation';

export const useAgentPresentationSlices = ({ support, polling }) => {
  const execution = useAgentExecutionPresentation({
    isMountedRef: support.isMountedRef,
    setIsLoading: support.setIsLoading,
    setActiveSessions: support.setActiveSessions,
    updateSession: support.updateSession,
    pollIntervalMs: polling.pollIntervalMs,
    maxPollAttempts: polling.maxPollAttempts
  });

  const catalog = useAgentCatalogPresentation({
    isMountedRef: support.isMountedRef,
    setIsLoading: support.setIsLoading,
    setAvailableAgents: support.setAvailableAgents,
    setActiveSessions: support.setActiveSessions
  });

  return {
    execution,
    catalog
  };
};
