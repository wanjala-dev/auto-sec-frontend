import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  deleteAgentInstance,
  executeAgentTask,
  getAgentExecution,
  getAgentState,
  pauseAgentInstance,
  resumeAgentInstance
} from '../../../application/agents/agentsService';
import {
  isTerminalAgentStatus,
  normalizeAgentStatus
} from '../../../domain/agents/agentExecution';

export const useAgentExecutionPresentation = ({
  isMountedRef,
  setIsLoading,
  setActiveSessions,
  updateSession,
  pollIntervalMs,
  maxPollAttempts
}: {
  isMountedRef: any;
  setIsLoading: any;
  setActiveSessions: any;
  updateSession: any;
  pollIntervalMs: number;
  maxPollAttempts: number;
}) => {
  const pollAgentExecution = useCallback(
    async (executionId, sessionId) => {
      if (!executionId) return null;

      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
        try {
          const data = await getAgentExecution(executionId);
          const normalizedStatus = normalizeAgentStatus(data?.status);

          if (isMountedRef.current) {
            updateSession(sessionId, (session) => ({
              ...session,
              status: normalizedStatus || session.status,
              progress:
                typeof data?.progress === 'number'
                  ? data.progress
                  : isTerminalAgentStatus(normalizedStatus)
                  ? 100
                  : session.progress ?? 0,
              conversationId:
                data?.conversation_id || session.conversationId || null,
              sessionData: {
                ...session.sessionData,
                execution: data,
                conversationId:
                  data?.conversation_id ||
                  session.sessionData?.conversationId ||
                  null
              },
              preview:
                data?.summary ||
                data?.result?.summary ||
                data?.result?.message ||
                session.preview,
              result: data?.result ?? data?.output ?? session.result ?? null,
              finishedAt: isTerminalAgentStatus(normalizedStatus)
                ? new Date().toISOString()
                : session.finishedAt
            }));
          }

          if (isTerminalAgentStatus(normalizedStatus)) {
            return data;
          }

          await sleep(pollIntervalMs);
        } catch (error) {
          if (isMountedRef.current) {
            updateSession(sessionId, {
              status: 'error',
              error: error.response?.data || error.message,
              finishedAt: new Date().toISOString()
            });
          }
          throw error;
        }
      }

      const timeoutError: Error & { code?: string } = new Error(
        'Timed out waiting for agent execution to finish'
      );
      timeoutError.code = 'AGENT_EXECUTION_TIMEOUT';
      if (isMountedRef.current) {
        updateSession(sessionId, {
          status: 'timeout',
          finishedAt: new Date().toISOString()
        });
      }
      throw timeoutError;
    },
    [isMountedRef, maxPollAttempts, pollIntervalMs, updateSession]
  );

  const executeAgent = useCallback(
    async (agentId, query, options = {}) => {
      const {
        conversationId: existingConversationId,
        seedId: overrideSeedId,
        metadata: metadataOverride,
        context: contextOverride
      } = options as any;
      if (!agentId) {
        toast.error('Agent id is required to execute a task');
        return null;
      }

      const normalizedQuery = typeof query === 'string' ? query.trim() : '';
      if (!normalizedQuery) {
        toast.error('Please provide a question or task for the agent');
        return null;
      }

      setIsLoading(true);

      try {
        const payload: any = {
          query: normalizedQuery
        };

        if (existingConversationId) {
          payload.conversation_id = existingConversationId;
        }
        if (overrideSeedId) {
          payload.seed_id = overrideSeedId;
        }
        if (metadataOverride) {
          payload.metadata = metadataOverride;
        }
        if (contextOverride) {
          payload.context = contextOverride;
        }

        const data = await executeAgentTask(agentId, payload);
        const executionId = data?.execution_id || null;
        const sessionId = executionId || `${agentId}-execution-${Date.now()}`;
        const initialStatus = normalizeAgentStatus(data?.status, 'queued');
        const shorten =
          normalizedQuery.length > 42
            ? `${normalizedQuery.slice(0, 42)}…`
            : normalizedQuery;

        const initialProgress = Number.isFinite(data?.progress)
          ? Math.max(0, Math.min(data.progress, 100))
          : 0;

        const newSession = {
          id: sessionId,
          agentId,
          executionId,
          taskId: data?.task_id,
          sessionKind: 'execution',
          title: data?.title || `Agent Execution – ${shorten}`,
          preview:
            data?.status_description ||
            data?.detail ||
            'Agent is processing your request…',
          timestamp: 'Just now',
          status: initialStatus,
          agentType: data?.agent_type_slug || data?.agent_type || 'execution',
          progress: initialProgress,
          isAgentSession: true,
          pollUrl: data?.poll_url || data?.status_url || null,
          query: normalizedQuery,
          sessionData: data,
          result: null,
          conversationId:
            data?.conversation_id || existingConversationId || null,
          seedId: data?.seed_id || overrideSeedId || null
        };

        setActiveSessions((prev) => {
          const withoutDuplicate = prev.filter(
            (session) => session.id !== sessionId
          );
          return [newSession, ...withoutDuplicate];
        });

        toast.info('Agent execution queued');

        const result = await pollAgentExecution(executionId, sessionId);
        const resultConversationId =
          result?.conversation_id ||
          result?.state?.conversation_id ||
          result?.conversation?.id ||
          result?.conversationId ||
          null;

        if (resultConversationId && isMountedRef.current) {
          updateSession(sessionId, (session) => ({
            ...session,
            conversationId: resultConversationId,
            sessionData: {
              ...session.sessionData,
              conversationId: resultConversationId
            }
          }));
        }

        const finalStatus = normalizeAgentStatus(result?.status);
        if (Number.isFinite(result?.progress)) {
          const normalizedProgress = Math.max(
            0,
            Math.min(result.progress, 100)
          );
          updateSession(sessionId, (session) => ({
            ...session,
            progress: normalizedProgress
          }));
        }

        if (['failed', 'error'].includes(finalStatus)) {
          toast.error(result?.error || 'Agent execution failed');
        } else if (finalStatus === 'cancelled' || finalStatus === 'canceled') {
          toast.info('Agent execution was cancelled');
        } else {
          toast.success('Agent execution completed');
        }

        return result;
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          'Unknown error';
        toast.error(`Failed to execute agent: ${message}`);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [
      isMountedRef,
      pollAgentExecution,
      setActiveSessions,
      setIsLoading,
      updateSession
    ]
  );

  const getAgentStatus = useCallback(
    async (idOrParams) => {
      const params =
        typeof idOrParams === 'string'
          ? { agentId: idOrParams }
          : idOrParams || {};

      const { agentId, executionId, sessionId } = params;

      try {
        if (executionId) {
          const data = await getAgentExecution(executionId);
          const targetId = sessionId || executionId;
          if (isMountedRef.current) {
            updateSession(targetId, (session) => ({
              ...session,
              status: (data?.status || session?.status || '').toLowerCase(),
              progress:
                typeof data?.progress === 'number'
                  ? data.progress
                  : session?.progress ?? 0,
              sessionData: {
                ...session?.sessionData,
                execution: data
              }
            }));
          }
          return data;
        }

        if (!agentId) {
          return null;
        }

        const data = await getAgentState(agentId);
        if (isMountedRef.current) {
          updateSession(agentId, (session) => ({
            ...session,
            status: data?.status || session?.status,
            sessionData: {
              ...session?.sessionData,
              state: data
            }
          }));
        }
        return data;
      } catch (_) {
        return null;
      }
    },
    [isMountedRef, updateSession]
  );

  const getAgentResults = useCallback(
    async (idOrParams) => {
      const params =
        typeof idOrParams === 'string'
          ? { agentId: idOrParams }
          : idOrParams || {};

      const { agentId, executionId, sessionId } = params;

      try {
        if (executionId) {
          const data = await getAgentExecution(executionId);
          if (isMountedRef.current) {
            const targetId = sessionId || executionId;
            updateSession(targetId, {
              sessionData: {
                execution: data
              },
              result: data?.result ?? data?.output ?? null
            });
          }
          return data?.result ?? data;
        }

        if (!agentId) {
          return null;
        }

        const data = await getAgentState(agentId);
        if (isMountedRef.current) {
          updateSession(agentId, (session) => ({
            ...session,
            sessionData: {
              ...session?.sessionData,
              state: data
            },
            result: data?.result ?? session?.result ?? null
          }));
        }
        return data?.result ?? data;
      } catch (error) {
        toast.error('Failed to retrieve agent results');
        throw error;
      }
    },
    [isMountedRef, updateSession]
  );

  const pauseAgent = useCallback(
    async (agentId) => {
      if (!agentId) {
        toast.error('Agent id is required to pause an agent');
        return null;
      }
      try {
        await pauseAgentInstance(agentId);

        if (isMountedRef.current) {
          updateSession(agentId, (session) => ({
            ...session,
            status: 'paused'
          }));
        }
        toast.success('Agent paused');
      } catch (error) {
        toast.error('Failed to pause agent');
        throw error;
      }
    },
    [isMountedRef, updateSession]
  );

  const resumeAgent = useCallback(
    async (agentId) => {
      if (!agentId) {
        toast.error('Agent id is required to resume an agent');
        return null;
      }
      try {
        await resumeAgentInstance(agentId);

        if (isMountedRef.current) {
          updateSession(agentId, (session) => ({
            ...session,
            status: 'running'
          }));
        }
        toast.success('Agent resumed');
      } catch (error) {
        toast.error('Failed to resume agent');
        throw error;
      }
    },
    [isMountedRef, updateSession]
  );

  const deleteAgent = useCallback(
    async (agentId) => {
      if (!agentId) {
        toast.error('Agent id is required to delete an agent');
        return null;
      }
      try {
        await deleteAgentInstance(agentId);

        setActiveSessions((prev) =>
          prev.filter(
            (session) => session.id !== agentId && session.agentId !== agentId
          )
        );
        toast.success('Agent deleted');
      } catch (error) {
        toast.error('Failed to delete agent');
        throw error;
      }
    },
    [setActiveSessions]
  );

  const removeAgent = useCallback(
    (agentId) => {
      if (!agentId) return null;
      let snapshot = null;
      setActiveSessions((prev) => {
        snapshot = prev;
        return prev.filter(
          (session) => session.agentId !== agentId && session.id !== agentId
        );
      });
      return snapshot;
    },
    [setActiveSessions]
  );

  const restoreAgents = useCallback(
    (sessionsSnapshot) => {
      if (!Array.isArray(sessionsSnapshot)) return;
      setActiveSessions(sessionsSnapshot);
    },
    [setActiveSessions]
  );

  return {
    updateSession,
    pollAgentExecution,
    executeAgent,
    getAgentStatus,
    getAgentResults,
    pauseAgent,
    resumeAgent,
    deleteAgent,
    removeAgent,
    restoreAgents
  };
};
