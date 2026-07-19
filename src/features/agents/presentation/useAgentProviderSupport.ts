import React, { useCallback, useEffect, useRef, useState } from 'react';

export const useAgentProviderSupport = ({ initialState }) => {
  const [activeSessions, setActiveSessions] = useState(
    initialState.activeSessions
  );
  const [availableAgents, setAvailableAgents] = useState(
    initialState.availableAgents
  );
  const [isLoading, setIsLoading] = useState(initialState.isLoading);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateSession = useCallback((sessionId, updater) => {
    setActiveSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        if (typeof updater === 'function') {
          return updater(session);
        }
        return { ...session, ...updater };
      })
    );
  }, []);

  return {
    activeSessions,
    setActiveSessions,
    availableAgents,
    setAvailableAgents,
    isLoading,
    setIsLoading,
    isMountedRef,
    updateSession
  };
};
