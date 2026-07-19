import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  createAgentInstance,
  listAgents,
  listAgentTypes
} from '../../../application/agents/agentsService';

export const useAgentCatalogPresentation = ({
  isMountedRef,
  setIsLoading,
  setAvailableAgents,
  setActiveSessions
}: {
  isMountedRef: any;
  setIsLoading: any;
  setAvailableAgents: any;
  setActiveSessions: any;
}) => {
  const createAgent = useCallback(
    async (agentTypeSlug, seedId, config = {}) => {
      if (!agentTypeSlug) {
        toast.error('Please pick an agent type before creating an agent');
        return null;
      }
      if (!seedId) {
        toast.error('A seed id is required to create an agent');
        return null;
      }

      setIsLoading(true);

      try {
        const data = await createAgentInstance({
          agentTypeSlug,
          seedId,
          config
        });

        const readableName =
          data?.agent_type_label || data?.agent_type_slug || agentTypeSlug;
        toast.success(`${readableName} agent created successfully!`);
        return data;
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          'Unknown error';
        toast.error(`Failed to create agent: ${message}`);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading]
  );

  const loadAvailableAgentTypes = useCallback(async () => {
    setIsLoading(true);

    const normalizeSlug = (slug) =>
      (slug || '').toString().toLowerCase().replace(/\s+/g, '_');

    const formatLabelFromSlug = (slug) =>
      slug
        .split('_')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    const iconForSlug = (slug) => {
      const map = {
        financial: '💰',
        finance: '💰',
        task_management: '📋',
        task: '✅',
        donation: '💝',
        fundraising: '💝',
        child_sponsorship: '👶',
        sponsorship: '🤝',
        project_management: '📊',
        project: '🎯'
      };
      if (slug === 'budget' || slug === 'budget_agent') return '🤖';
      return map[slug] || '🤖';
    };

    try {
      const data = await listAgentTypes();

      const rawTypes = Array.isArray(data)
        ? data
        : data?.agent_types || data?.results || data?.types || [];

      const typesArray = Array.isArray(rawTypes)
        ? rawTypes
        : Object.values(rawTypes || {});

      const transformedAgents = typesArray.map((type) => {
        const slug = normalizeSlug(
          type?.slug || type?.agent_type_slug || type?.agent_type || type?.id
        );
        const shouldAppendAgent =
          !slug.toLowerCase().endsWith('_agent') &&
          !slug.toLowerCase().endsWith('agent');
        const label =
          type?.label ||
          type?.agent_type_label ||
          `${formatLabelFromSlug(slug)}${shouldAppendAgent ? ' Agent' : ''}`;
        const description =
          type?.description ||
          type?.summary ||
          type?.preview ||
          `Handles ${formatLabelFromSlug(slug)} tasks`;

        return {
          id: slug || `agent-${Date.now()}`,
          title: label,
          preview: description,
          timestamp: 'Available',
          status: 'available',
          agentType: slug,
          agentTypeLabel: label,
          capabilities: type?.capabilities || type?.config?.capabilities || [],
          icon: iconForSlug(slug),
          configTemplate: type?.config || {},
          aliases: type?.aliases || [],
          isAgent: true,
          raw: type
        };
      });

      if (transformedAgents.length === 0) {
        toast.info('No agent types available yet. Please try again later.');
      }

      if (isMountedRef.current) {
        setAvailableAgents(transformedAgents);
      }
      return data;
    } catch (_) {
      toast.error('Failed to load available agent types');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isMountedRef, setAvailableAgents, setIsLoading]);

  const loadActiveAgents = useCallback(async () => {
    try {
      const data = await listAgents();

      const rawAgents = Array.isArray(data)
        ? data
        : data?.agents || data?.results || [];

      const agentsArray = Array.isArray(rawAgents)
        ? rawAgents
        : Object.values(rawAgents || {});

      const toLabel = (slug, fallback) => {
        if (fallback) return fallback;
        if (!slug) return 'Agent';
        return slug
          .toString()
          .replace('Agent', '')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/_/g, ' ')
          .trim()
          .replace(/\b\w/g, (c) => c.toUpperCase());
      };

      const transformedSessions = agentsArray.map((agent) => {
        const agentId = agent?.agent_id || agent?.id;
        const slug = agent?.agent_type_slug || agent?.agent_type;
        const label = toLabel(slug, agent?.agent_type_label);
        const latestExecution =
          agent?.latest_execution || agent?.current_execution;
        const status = (
          latestExecution?.status ||
          agent?.status ||
          'idle'
        ).toLowerCase();
        const terminal = [
          'completed',
          'succeeded',
          'failed',
          'error',
          'canceled',
          'cancelled'
        ];
        const derivedProgress =
          typeof latestExecution?.progress === 'number'
            ? latestExecution.progress
            : terminal.includes(status)
            ? 100
            : typeof agent?.progress === 'number'
            ? agent.progress
            : 0;
        const progress = Number.isFinite(derivedProgress)
          ? Math.max(0, Math.min(derivedProgress, 100))
          : 0;
        const executionId =
          latestExecution?.execution_id || latestExecution?.id;
        const preview =
          latestExecution?.summary ||
          latestExecution?.result?.summary ||
          agent?.status_description ||
          (status === 'running'
            ? 'Agent is processing...'
            : status === 'paused'
            ? 'Agent is paused'
            : 'Agent is ready');
        const timestampSource =
          latestExecution?.updated_at || agent?.updated_at || agent?.created_at;
        const timestamp = timestampSource
          ? new Date(timestampSource).toLocaleString()
          : 'Active';

        const conversationId =
          latestExecution?.conversation_id ||
          agent?.conversation_id ||
          agent?.state?.conversation_id ||
          agent?.conversation?.id ||
          null;
        const seedId =
          agent?.seed_id || agent?.seed?.id || agent?.seed?.pk || null;

        return {
          id: agentId,
          agentId,
          executionId,
          sessionKind: 'agent',
          title: `${label} – ${
            agentId ? agentId.slice(-6).toUpperCase() : ''
          }`.trim(),
          preview,
          timestamp,
          status,
          agentType: slug,
          agentTypeLabel: label,
          progress,
          isAgentSession: true,
          sessionData: agent,
          result: latestExecution?.result || null,
          lastExecution: latestExecution || null,
          conversationId,
          seedId
        };
      });

      if (isMountedRef.current) {
        setActiveSessions((prev) => {
          const nonAgentSessions = prev.filter(
            (session) => session.sessionKind !== 'agent'
          );
          const merged = [...transformedSessions];

          nonAgentSessions.forEach((session) => {
            if (!merged.some((item) => item.id === session.id)) {
              merged.push(session);
            }
          });

          return merged;
        });
      }

      return data;
    } catch (_) {
      return [];
    }
  }, [isMountedRef, setActiveSessions]);

  return {
    createAgent,
    loadAvailableAgentTypes,
    loadActiveAgents
  };
};
