import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

import apiClient from '../../infrastructure/http/apiClient';
import HexLoader from './HexLoader';
import HudCard from './HudCard';
import HudChip from './HudChip';

/**
 * HudPosturePanel — the POSTURE module of the V2 command center.
 *
 * Renders the security-posture dashboard from
 * ``GET /ai/agents/posture/dashboard/`` (posture vision §1/§5/§8): four
 * HUD-styled daily charts (log lines, AI cost with weekly/monthly
 * compounding, findings filed, runs), the response-KPI band table
 * (medians vs industry benchmark bands), the CTEM stage strip, and a
 * persona lens switch (ENGINEER / EXECUTIVE — same facts, different
 * framing; the executive lens is the NACD board shape with no per-row
 * ids).
 *
 * Hard rules honoured here:
 * - NO composite posture score — components only, ever.
 * - ACTION-LINKED everywhere: every number/chart drills somewhere via
 *   the backend's ``link`` hints (kanban board, agents ring, logs).
 *   No dead numbers, no graph wall.
 * - Honest empties: ``no_data`` renders "NO DATA IN WINDOW", never an
 *   invented zero-trend.
 */

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

const CYAN = '#2EDBE8';
const MONO = "'JetBrains Mono', 'Fira Code', monospace";

const PERSONAS = [
  { id: 'engineer', label: 'ENGINEER' },
  { id: 'executive', label: 'EXECUTIVE' }
];

const WINDOWS = [
  { id: 7, label: '7D' },
  { id: 30, label: '30D' }
];

// Backend link hints → HUD surfaces the host page can open.
const LINK_LABELS = {
  kanban: 'OPEN BOARD ▸',
  agents: 'OPEN FLEET ▸',
  logs: 'OPEN LOGS ▸'
};

const chartOptions = (isCost) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(10,15,26,0.95)',
      borderColor: 'rgba(46,219,232,0.35)',
      borderWidth: 1,
      titleColor: CYAN,
      bodyColor: '#cbd5e1',
      titleFont: { family: MONO, size: 9 },
      bodyFont: { family: MONO, size: 9 },
      displayColors: false,
      callbacks: isCost
        ? { label: (ctx) => `$${Number(ctx.parsed.y).toFixed(4)}` }
        : {}
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(46,219,232,0.05)' },
      ticks: {
        color: 'rgba(46,219,232,0.45)',
        font: { family: MONO, size: 7 },
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 8
      }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(46,219,232,0.07)' },
      ticks: {
        color: 'rgba(46,219,232,0.45)',
        font: { family: MONO, size: 7 },
        precision: isCost ? undefined : 0
      }
    }
  }
});

const shortDate = (iso) => (iso || '').slice(5); // YYYY-MM-DD → MM-DD

const barData = (points, colorAlpha = 0.55) => ({
  labels: (points || []).map((p) => shortDate(p.date)),
  datasets: [
    {
      data: (points || []).map((p) => p.value),
      backgroundColor: `rgba(46,219,232,${colorAlpha})`,
      borderColor: CYAN,
      borderWidth: 1,
      maxBarThickness: 18
    }
  ]
});

const lineData = (points) => ({
  labels: (points || []).map((p) => shortDate(p.date)),
  datasets: [
    {
      data: (points || []).map((p) => p.value),
      borderColor: CYAN,
      borderWidth: 1.5,
      pointRadius: 2,
      pointBackgroundColor: CYAN,
      fill: true,
      backgroundColor: 'rgba(46,219,232,0.08)',
      tension: 0.25
    }
  ]
});

const formatUsd = (value) => {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n >= 100 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
};

const formatHours = (value) => {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${n.toFixed(1)}h`;
};

const formatPercent = (value) => {
  if (value === null || value === undefined) return '—';
  return `${Math.round(Number(value) * 100)}%`;
};

const NoData = () => (
  <div className="flex h-full items-center justify-center">
    <span className="font-mono text-[9px] tracking-[0.2em] text-hud-dim">
      NO DATA IN WINDOW
    </span>
  </div>
);

/** One chart card. The whole header row is the drill link — no dead numbers. */
const ChartCard = ({ title, headline, sub, series, kind, onDrill, isCost }) => {
  const link = series?.link?.panel;
  return (
    <HudCard size="sm" bodyClassName="p-3 flex flex-col h-[180px]">
      <button
        type="button"
        onClick={() => link && onDrill(link)}
        className="group mb-1 flex w-full items-baseline justify-between text-left"
        title={link ? `Drill into ${link}` : undefined}
      >
        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-500/50 group-hover:text-cyan-400">
          {title}
        </span>
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-[12px] font-bold tabular-nums text-hud-text">
            {headline}
          </span>
          {link && (
            <span className="font-mono text-[7px] tracking-widest text-hud-dim group-hover:text-cyan-400">
              {LINK_LABELS[link] || 'OPEN ▸'}
            </span>
          )}
        </span>
      </button>
      {sub && (
        <p className="mb-1 font-mono text-[8px] text-amber-400/70">{sub}</p>
      )}
      <div className="min-h-0 flex-1">
        {series?.no_data ? (
          <NoData />
        ) : kind === 'line' ? (
          <Line data={lineData(series?.points)} options={chartOptions(isCost)} />
        ) : (
          <Bar data={barData(series?.points)} options={chartOptions(isCost)} />
        )}
      </div>
    </HudCard>
  );
};

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  headline: PropTypes.node,
  sub: PropTypes.node,
  series: PropTypes.object,
  kind: PropTypes.oneOf(['bar', 'line']),
  onDrill: PropTypes.func.isRequired,
  isCost: PropTypes.bool
};

/** A single action-linked stat. */
const StatButton = ({ label, value, tone = 'cyan', link, onDrill }) => {
  const toneColor =
    tone === 'amber' ? '#F59E0B' : tone === 'emerald' ? '#34d399' : CYAN;
  return (
    <button
      type="button"
      onClick={() => link && onDrill(link)}
      className="group flex flex-col items-start border border-hud-line/10 bg-black/30 px-3 py-2 text-left transition hover:border-hud-line/30 hover:bg-cyan-500/[0.05]"
      title={link ? `Drill into ${link}` : undefined}
    >
      <span className="font-mono text-[7px] uppercase tracking-[0.2em] text-hud-dim group-hover:text-cyan-400">
        {label}
      </span>
      <span
        className="font-mono text-[14px] font-bold tabular-nums"
        style={{ color: toneColor }}
      >
        {value}
      </span>
    </button>
  );
};

StatButton.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  tone: PropTypes.string,
  link: PropTypes.string,
  onDrill: PropTypes.func.isRequired
};

const KpiBandTable = ({ kpiBands, onDrill }) => {
  const bands = kpiBands?.triage_latency_by_severity || {};
  const ack = kpiBands?.acknowledgment_latency;
  const order = ['critical', 'high', 'medium', 'low'];
  const link = kpiBands?.link?.panel || 'kanban';
  return (
    <HudCard size="sm" bodyClassName="p-3">
      <button
        type="button"
        onClick={() => onDrill(link)}
        className="group mb-2 flex w-full items-baseline justify-between text-left"
      >
        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-500/50 group-hover:text-cyan-400">
          Response KPIs · median vs benchmark band
        </span>
        <span className="font-mono text-[7px] tracking-widest text-hud-dim group-hover:text-cyan-400">
          {LINK_LABELS[link]}
        </span>
      </button>
      <table className="w-full font-mono text-[9px] tabular-nums">
        <thead>
          <tr className="border-b border-hud-line/10 text-left text-hud-dim">
            <th className="py-1 pr-2 font-normal">SEVERITY</th>
            <th className="py-1 pr-2 text-right font-normal">MEDIAN</th>
            <th className="py-1 pr-2 text-right font-normal">BAND</th>
            <th className="py-1 pr-2 text-right font-normal">SAMPLES</th>
            <th className="py-1 text-right font-normal">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {order.map((sev) => {
            const row = bands[sev] || {};
            const within = row.within_band;
            return (
              <tr
                key={sev}
                className={`border-b border-hud-line/[0.04] ${
                  within === true ? 'bg-emerald-500/[0.05]' : ''
                }`}
              >
                <td className="py-1 pr-2 uppercase text-hud-text">{sev}</td>
                <td className="py-1 pr-2 text-right text-hud-text">
                  {formatHours(row.median_hours)}
                </td>
                <td className="py-1 pr-2 text-right text-hud-dim">
                  ≤{formatHours(row.band_hours)}
                </td>
                <td className="py-1 pr-2 text-right text-hud-dim">
                  {row.sample_count ?? 0}
                </td>
                <td className="py-1 text-right">
                  {row.no_data ? (
                    <span className="text-hud-dim">NO DATA</span>
                  ) : within ? (
                    <span style={{ color: '#34d399' }}>WITHIN BAND</span>
                  ) : (
                    <span style={{ color: '#f87171' }}>OVER BAND</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 font-mono text-[8px] text-hud-dim">
        ACK median{' '}
        <span className="text-hud-text">
          {formatHours(ack?.median_hours)}
        </span>{' '}
        ({ack?.sample_count ?? 0} samples) · benchmark:{' '}
        {kpiBands?.benchmark_source || '—'}
      </p>
    </HudCard>
  );
};

KpiBandTable.propTypes = {
  kpiBands: PropTypes.object,
  onDrill: PropTypes.func.isRequired
};

const CTEM_STAGES = [
  { id: 'discovery', label: 'DISCOVERY', link: 'logs' },
  { id: 'prioritization', label: 'PRIORITIZATION', link: 'kanban' },
  { id: 'validation', label: 'VALIDATION', link: 'agents' },
  { id: 'mobilization', label: 'MOBILIZATION', link: 'kanban' }
];

const CtemStrip = ({ mapping, onDrill }) => (
  <div className="grid grid-cols-4 gap-[2px]">
    {CTEM_STAGES.map((stage, idx) => (
      <button
        key={stage.id}
        type="button"
        onClick={() => onDrill(stage.link)}
        title={mapping?.[stage.id] || ''}
        className="group border border-hud-line/10 bg-black/30 px-2 py-1.5 text-left transition hover:border-hud-line/30 hover:bg-cyan-500/[0.05]"
      >
        <span className="block font-mono text-[7px] tracking-[0.15em] text-cyan-500/50 group-hover:text-cyan-400">
          {idx + 1} · {stage.label}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[8px] text-hud-dim">
          {mapping?.[stage.id] || '—'}
        </span>
      </button>
    ))}
  </div>
);

CtemStrip.propTypes = {
  mapping: PropTypes.object,
  onDrill: PropTypes.func.isRequired
};

const NacdSummary = ({ nacd, onDrill }) => {
  if (!nacd) return null;
  const blocks = [
    {
      title: 'THREAT ENVIRONMENT',
      link: 'kanban',
      rows: [
        ['Open findings', nacd.threat_environment?.open_findings_total],
        [
          'Trend (WoW)',
          `${nacd.threat_environment?.findings_trend?.direction || '—'} (${
            nacd.threat_environment?.findings_trend?.delta ?? '—'
          })`
        ]
      ]
    },
    {
      title: 'FINANCIAL',
      link: 'agents',
      rows: [
        [
          'AI spend (window)',
          nacd.financial?.cost_no_data
            ? 'no data'
            : formatUsd(nacd.financial?.total_cost_usd_window)
        ],
        [
          'Per day',
          nacd.financial?.cost_no_data
            ? 'no data'
            : formatUsd(nacd.financial?.cost_per_day_usd)
        ]
      ]
    },
    {
      title: 'MATURITY',
      link: 'agents',
      rows: [
        ['Rubric pass rate', formatPercent(nacd.maturity?.rubric_pass_rate)],
        ['Run success', formatPercent(nacd.maturity?.run_success_rate)],
        [
          'Toil absorbed',
          formatPercent(nacd.maturity?.toil_auto_absorption_rate)
        ]
      ]
    },
    {
      title: 'FORWARD-LOOKING',
      link: 'kanban',
      rows: [
        ['Needs-human backlog', nacd.forward_looking?.needs_human_backlog],
        [
          'Oldest untriaged',
          formatHours(nacd.forward_looking?.oldest_untriaged_age_hours)
        ],
        ['Direction', nacd.forward_looking?.direction || '—']
      ]
    }
  ];
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {blocks.map((block) => (
        <button
          key={block.title}
          type="button"
          onClick={() => onDrill(block.link)}
          className="group border border-hud-line/10 bg-black/30 p-2 text-left transition hover:border-hud-line/30 hover:bg-cyan-500/[0.05]"
        >
          <span className="mb-1 block font-mono text-[7px] tracking-[0.2em] text-cyan-500/50 group-hover:text-cyan-400">
            {block.title}
          </span>
          {block.rows.map(([label, value]) => (
            <span
              key={label}
              className="flex items-baseline justify-between font-mono text-[9px]"
            >
              <span className="text-hud-dim">{label}</span>
              <span className="tabular-nums text-hud-text">{value ?? '—'}</span>
            </span>
          ))}
        </button>
      ))}
    </div>
  );
};

NacdSummary.propTypes = {
  nacd: PropTypes.object,
  onDrill: PropTypes.func.isRequired
};

export default function HudPosturePanel({ seedId, onNavigate }) {
  const [persona, setPersona] = useState('engineer');
  const [windowDays, setWindowDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    if (!seedId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/ai/agents/posture/dashboard/', {
        params: {
          workspace_id: seedId,
          persona,
          window_days: windowDays
        }
      });
      setData(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'Failed to load the posture dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }, [seedId, persona, windowDays]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onDrill = useCallback(
    (panel) => {
      if (onNavigate) onNavigate(panel);
    },
    [onNavigate]
  );

  const series = data?.series || {};
  const cost = series.ai_cost_per_day;
  const isExecutive = persona === 'executive';
  const posture = data?.posture;
  const activity = data?.governance_activity;

  const engineerStats = useMemo(() => {
    if (!posture || isExecutive) return null;
    const findings = posture.findings_posture || {};
    const fleet = posture.fleet_health || {};
    return {
      openFindings: findings.open_findings?.total ?? 0,
      needsHuman: findings.needs_human_backlog?.count ?? 0,
      toil: findings.toil?.auto_absorption_rate,
      runsTotal: fleet.deep_runs?.total ?? 0,
      runSuccess: fleet.deep_runs?.success_rate,
      toolCalls: activity?.tool_calls?.total ?? 0
    };
  }, [posture, activity, isExecutive]);

  const costSub =
    cost && !cost.no_data && cost.projected_weekly_usd !== null
      ? `≈ ${formatUsd(cost.projected_weekly_usd)}/wk · ${formatUsd(
          cost.projected_monthly_usd
        )}/mo at current burn`
      : null;

  if (!seedId) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="font-mono text-[10px] text-hud-dim">
          Select a workspace to load its posture.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Lens + window controls ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {PERSONAS.map((p) => (
            <HudChip
              key={p.id}
              active={persona === p.id}
              onClick={() => setPersona(p.id)}
              className={
                persona === p.id
                  ? 'text-cyan-400'
                  : 'text-gray-500 hover:text-cyan-400'
              }
            >
              {p.label}
            </HudChip>
          ))}
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <HudChip
              key={w.id}
              active={windowDays === w.id}
              onClick={() => setWindowDays(w.id)}
              className={
                windowDays === w.id
                  ? 'text-cyan-400'
                  : 'text-gray-500 hover:text-cyan-400'
              }
            >
              {w.label}
            </HudChip>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <HexLoader size={110} label="AGGREGATING POSTURE" />
        </div>
      ) : error ? (
        <div className="font-mono">
          <p className="text-[10px] text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchDashboard}
            className="mt-1 text-[8px] uppercase tracking-[0.2em] text-cyan-500/50 hover:text-cyan-400"
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <>
          {/* ── Persona summary strip ── */}
          {isExecutive ? (
            <NacdSummary nacd={posture?.nacd_summary} onDrill={onDrill} />
          ) : (
            engineerStats && (
              <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
                <StatButton
                  label="OPEN FINDINGS"
                  value={engineerStats.openFindings}
                  tone={engineerStats.openFindings > 0 ? 'amber' : 'emerald'}
                  link="kanban"
                  onDrill={onDrill}
                />
                <StatButton
                  label="NEEDS HUMAN"
                  value={engineerStats.needsHuman}
                  tone={engineerStats.needsHuman > 0 ? 'amber' : 'emerald'}
                  link="kanban"
                  onDrill={onDrill}
                />
                <StatButton
                  label="TOIL ABSORBED"
                  value={formatPercent(engineerStats.toil)}
                  tone="emerald"
                  link="kanban"
                  onDrill={onDrill}
                />
                <StatButton
                  label="RUNS"
                  value={engineerStats.runsTotal}
                  link="agents"
                  onDrill={onDrill}
                />
                <StatButton
                  label="RUN SUCCESS"
                  value={formatPercent(engineerStats.runSuccess)}
                  link="agents"
                  onDrill={onDrill}
                />
                <StatButton
                  label="TOOL CALLS"
                  value={engineerStats.toolCalls}
                  link="agents"
                  onDrill={onDrill}
                />
              </div>
            )
          )}

          {/* ── Daily charts ── */}
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <ChartCard
              title="LOG LINES / DAY"
              headline={
                series.log_lines_per_day?.no_data
                  ? '—'
                  : Number(
                      series.log_lines_per_day?.total || 0
                    ).toLocaleString()
              }
              series={series.log_lines_per_day}
              kind="bar"
              onDrill={onDrill}
            />
            <ChartCard
              title="AI COST / DAY"
              headline={
                cost?.no_data ? '—' : formatUsd(cost?.total_usd)
              }
              sub={costSub}
              series={cost}
              kind="bar"
              isCost
              onDrill={onDrill}
            />
            <ChartCard
              title="FINDINGS FILED / DAY"
              headline={
                series.findings_created_per_day?.no_data
                  ? '—'
                  : series.findings_created_per_day?.total
              }
              series={series.findings_created_per_day}
              kind="line"
              onDrill={onDrill}
            />
            <ChartCard
              title="AGENT RUNS / DAY"
              headline={
                series.runs_per_day?.no_data ? '—' : series.runs_per_day?.total
              }
              series={series.runs_per_day}
              kind="bar"
              onDrill={onDrill}
            />
          </div>

          {/* ── KPI band table ── */}
          <KpiBandTable kpiBands={data.kpi_bands} onDrill={onDrill} />

          {/* ── CTEM stage strip ── */}
          <CtemStrip mapping={data.ctem_mapping} onDrill={onDrill} />
        </>
      ) : null}
    </div>
  );
}

HudPosturePanel.propTypes = {
  seedId: PropTypes.string,
  onNavigate: PropTypes.func
};
