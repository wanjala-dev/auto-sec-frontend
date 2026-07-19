import { useMemo } from 'react';

export const useAgentProviderValue = ({
  activeSessions,
  availableAgents,
  isLoading,
  execution,
  catalog,
  updateSession,
  agentUtilities
}: {
  activeSessions: any;
  availableAgents: any;
  isLoading: boolean;
  execution: any;
  catalog: any;
  updateSession: any;
  agentUtilities: any;
}) =>
  useMemo(
    () => ({
      activeSessions,
      availableAgents,
      isLoading,
      ...execution,
      ...catalog,
      updateSession,
      agentUtilities
    }),
    [
      activeSessions,
      availableAgents,
      isLoading,
      execution,
      catalog,
      updateSession,
      agentUtilities
    ]
  );
