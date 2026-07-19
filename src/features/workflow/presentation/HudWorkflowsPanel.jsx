import React, { useCallback, useEffect, useState } from 'react';
import { FiChevronRight, FiChevronDown, FiZap, FiClock } from 'react-icons/fi';

import HudCard from '../../../components/V2/HudCard';
import HudText from '../../../components/V2/HudText';
import HexLoader from '../../../components/V2/HexLoader';
import RestrictedArea from '../../../components/V2/RestrictedArea';
import { workflowService } from '../../../application/workflow/workflowService';

const list = (res) =>
  res?.data?.data?.results ||
  res?.data?.results ||
  res?.data?.data ||
  (Array.isArray(res?.data) ? res.data : []) ||
  [];

const wfName = (w) => w?.name || w?.title || `Workflow ${w?.id ?? ''}`.trim();
const wfStatus = (w) =>
  (w?.status ||
    (w?.is_published ? 'published' : w?.is_active ? 'active' : 'draft') ||
    'draft').toString();

const STATUS_C = {
  published: '#34d399',
  active: '#34d399',
  running: '#2EDBE8',
  draft: '#F59E0B',
  archived: '#64748b',
  failed: '#E84D8A',
  completed: '#34d399',
  paused: '#F59E0B'
};
const statusColor = (s) => STATUS_C[(s || '').toLowerCase()] || '#64748b';

const timeOf = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '';
  }
};

/**
 * HudWorkflowsPanel — the workspace automation surface (workflows + their runs)
 * as HUD panel content. Read-focused: lists workflows with status and expands
 * to show recent runs. Backed by the ported workflow context.
 */
export default function HudWorkflowsPanel() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [runs, setRuns] = useState({}); // workflowId -> runs[]
  const [loadingRuns, setLoadingRuns] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await workflowService.fetchWorkflows();
        if (!cancelled) setWorkflows(list(res));
      } catch (e) {
        if (!cancelled)
          setError(
            e?.response?.status === 403
              ? 'Automation is disabled for this workspace.'
              : 'Unable to load workflows.'
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(
    async (w) => {
      const id = w.id;
      if (openId === id) {
        setOpenId(null);
        return;
      }
      setOpenId(id);
      if (!runs[id]) {
        setLoadingRuns(true);
        try {
          const res = await workflowService.fetchWorkflowRuns(id);
          setRuns((prev) => ({ ...prev, [id]: list(res) }));
        } catch {
          setRuns((prev) => ({ ...prev, [id]: [] }));
        } finally {
          setLoadingRuns(false);
        }
      }
    },
    [openId, runs]
  );

  return (
    <div className="mx-auto flex h-[70vh] w-full max-w-3xl flex-col p-1">
      <div className="mb-3 flex items-center gap-2">
        <FiZap size={13} className="text-hud-accent" />
        <HudText variant="label" color="cyan-muted">
          AUTOMATIONS
        </HudText>
        <span className="font-mono text-[8px] text-hud-dim">
          {workflows.length} WORKFLOW{workflows.length === 1 ? '' : 'S'}
        </span>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto cc-scrollbar pr-1">
        {loading ? (
          <div className="flex justify-center py-12">
            <HexLoader size={52} />
          </div>
        ) : error ? (
          <RestrictedArea variant="warning" title="WORKFLOWS" subtitle={error} />
        ) : workflows.length === 0 ? (
          <RestrictedArea
            variant="info"
            title="NO WORKFLOWS YET"
            subtitle="—"
            message="No automations are configured for this workspace."
          />
        ) : (
          workflows.map((w) => {
            const open = openId === w.id;
            const status = wfStatus(w);
            const wfRuns = runs[w.id] || [];
            return (
              <HudCard
                key={w.id}
                chamfer={10}
                border="cyan"
                surface="bg-hud-surface/60"
                bodyClassName="p-0"
              >
                <button
                  type="button"
                  onClick={() => toggle(w)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                >
                  {open ? (
                    <FiChevronDown size={12} className="text-hud-accent" />
                  ) : (
                    <FiChevronRight size={12} className="text-hud-dim" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[12px] text-hud-text">
                      {wfName(w)}
                    </span>
                    {(w.trigger_type || w.trigger) && (
                      <span className="block font-mono text-[8px] text-hud-dim">
                        trigger: {w.trigger_type || w.trigger}
                      </span>
                    )}
                  </span>
                  <span
                    className="flex-shrink-0 border px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-wider"
                    style={{
                      color: statusColor(status),
                      borderColor: `${statusColor(status)}44`,
                      background: `${statusColor(status)}11`
                    }}
                  >
                    {status.toUpperCase()}
                  </span>
                </button>

                {open && (
                  <div className="border-t border-hud-line/10 px-3 py-2">
                    <p className="mb-1.5 flex items-center gap-1 font-mono text-[8px] tracking-wider text-hud-dim">
                      <FiClock size={9} /> RECENT RUNS
                    </p>
                    {loadingRuns && !runs[w.id] ? (
                      <div className="flex justify-center py-3">
                        <HexLoader size={26} />
                      </div>
                    ) : wfRuns.length === 0 ? (
                      <span className="font-mono text-[9px] text-hud-dim">
                        — NO RUNS —
                      </span>
                    ) : (
                      <div className="space-y-1">
                        {wfRuns.slice(0, 10).map((r) => {
                          const rs = (r.status || '').toString();
                          return (
                            <div
                              key={r.id}
                              className="flex items-center gap-2 font-mono text-[9px]"
                            >
                              <span
                                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                                style={{ background: statusColor(rs) }}
                              />
                              <span className="flex-1 text-hud-dim">
                                {timeOf(r.started_at || r.created_at)}
                              </span>
                              <span
                                style={{ color: statusColor(rs) }}
                                className="font-bold"
                              >
                                {rs.toUpperCase()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </HudCard>
            );
          })
        )}
      </div>
    </div>
  );
}
