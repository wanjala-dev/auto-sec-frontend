import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import HudPanel from './HudPanel';
import { useAgentPromptEvalReports } from '../../hooks/useAgentPromptEvalReports';

/**
 * Wave 4 of the prompt-evaluation plan — V2 Command Center
 * "Prompt Quality" panel.
 *
 * Three vertical blocks inside a single HudPanel:
 *   A. Headline — last 7 days, X reports, avg score Y/10
 *   B. Score by prompt — small table sortable by prompt_id,
 *      descending by score by default. Trend arrow vs previous run.
 *      Click a row to drill into Block C filtered to that prompt+version.
 *   C. Top 5 lowest-scoring cases across the displayed reports — each
 *      links out to the HTML report served at the same path as the
 *      JSON minus the extension.
 *
 * Reads from ``/ai/prompt-eval/reports/`` via
 * ``useAgentPromptEvalReports``. Renders an empty state until the
 * backend ships reports.
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const PASS_THRESHOLD = 7;

const formatScore = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return Number(value).toFixed(1);
};

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${Math.round(Number(value) * 100)}%`;
};

const formatRelativeTime = (iso) => {
  if (!iso) return '—';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '—';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
};

/**
 * Backend serves the HTML report at the same path as the JSON minus
 * the extension. The JSON list returns filenames like
 * ``planner_v3__2026-06-07.json``; the HTML lives at the same name
 * with ``.html``.
 */
const buildReportHtmlHref = (filename) => {
  if (!filename) return null;
  const base = String(filename).replace(/\.json$/i, '');
  return `/ai/prompt-eval/reports/${encodeURIComponent(base)}.html`;
};

/**
 * Bucket reports by prompt_id+version and keep the two most recent
 * runs per bucket so we can render a trend arrow vs the previous run.
 */
const groupReportsByPromptVersion = (reports) => {
  const buckets = new Map();
  reports.forEach((report) => {
    const key = `${report.prompt_id}@${report.version}`;
    const bucket = buckets.get(key) || {
      prompt_id: report.prompt_id,
      version: report.version,
      label: report.label || null,
      latest: null,
      previous: null
    };
    const ts = report.created_at ? Date.parse(report.created_at) : 0;
    const latestTs = bucket.latest?.created_at
      ? Date.parse(bucket.latest.created_at)
      : 0;
    if (!bucket.latest || ts > latestTs) {
      bucket.previous = bucket.latest;
      bucket.latest = report;
    } else if (!bucket.previous) {
      bucket.previous = report;
    } else {
      const previousTs = bucket.previous.created_at
        ? Date.parse(bucket.previous.created_at)
        : 0;
      if (ts > previousTs) {
        bucket.previous = report;
      }
    }
    buckets.set(key, bucket);
  });
  return Array.from(buckets.values());
};

const inLastSevenDays = (report) => {
  if (!report?.created_at) return false;
  const ts = Date.parse(report.created_at);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= SEVEN_DAYS_MS;
};

/**
 * The list endpoint returns per-report summaries (no full
 * ``cases`` array) so the "top 5 lowest-scoring cases" block falls
 * back to per-prompt scores when the harness hasn't shipped case-level
 * data yet. When the backend later inlines a ``worst_cases`` field on
 * the summary we read that here without changing the consumer.
 */
const extractWorstCases = (reports) => {
  const cases = [];
  reports.forEach((report) => {
    const worst = Array.isArray(report.worst_cases) ? report.worst_cases : [];
    worst.forEach((row) => {
      if (!row) return;
      cases.push({
        case_id: row.id || row.case_id || 'unknown',
        score:
          typeof row.score === 'number' ? row.score : Number(row.score) || 0,
        prompt_id: report.prompt_id,
        version: report.version,
        filename: report.filename
      });
    });
  });
  cases.sort((a, b) => a.score - b.score);
  return cases.slice(0, 5);
};

const HeadlineBlock = ({ reports }) => {
  const lastWeek = useMemo(() => reports.filter(inLastSevenDays), [reports]);
  const avgScore = useMemo(() => {
    if (lastWeek.length === 0) return null;
    const total = lastWeek.reduce(
      (sum, r) => sum + (Number(r.avg_score) || 0),
      0
    );
    return total / lastWeek.length;
  }, [lastWeek]);

  return (
    <div className="flex items-baseline justify-between font-mono">
      <div>
        <p className="text-[8px] uppercase tracking-[0.2em] text-cyan-500/40">
          Last 7 days
        </p>
        <p className="text-[14px] font-bold text-cyan-300 tabular-nums">
          {lastWeek.length} {lastWeek.length === 1 ? 'report' : 'reports'}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[8px] uppercase tracking-[0.2em] text-cyan-500/40">
          Avg score
        </p>
        <p
          className="text-[14px] font-bold tabular-nums"
          style={{ color: '#34d399' }}
        >
          {formatScore(avgScore)}
          <span className="text-[10px] text-hud-dim">/10</span>
        </p>
      </div>
    </div>
  );
};

HeadlineBlock.propTypes = {
  reports: PropTypes.array.isRequired
};

const TrendArrow = ({ delta }) => {
  if (delta === null || delta === undefined || Number.isNaN(delta)) {
    return <span className="text-hud-dim">—</span>;
  }
  if (delta > 0.05) {
    return (
      <span style={{ color: '#34d399' }} title={`+${delta.toFixed(2)}`}>
        ▲
      </span>
    );
  }
  if (delta < -0.05) {
    return (
      <span style={{ color: '#f87171' }} title={delta.toFixed(2)}>
        ▼
      </span>
    );
  }
  return (
    <span className="text-hud-dim" title="flat">
      ▶
    </span>
  );
};

TrendArrow.propTypes = {
  delta: PropTypes.number
};

const ScoreByPromptBlock = ({ reports, activeKey, onPick }) => {
  const groups = useMemo(() => {
    const buckets = groupReportsByPromptVersion(reports);
    return buckets.sort((a, b) => {
      const aScore = Number(a.latest?.avg_score) || 0;
      const bScore = Number(b.latest?.avg_score) || 0;
      return bScore - aScore;
    });
  }, [reports]);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="font-mono">
      <p className="text-[8px] uppercase tracking-[0.2em] text-cyan-500/40 mb-1">
        Score by prompt
      </p>
      <div className="max-h-[120px] overflow-y-auto">
        <table className="w-full text-[10px] tabular-nums">
          <thead>
            <tr className="text-left text-hud-dim border-b border-hud-line/10">
              <th className="font-normal py-[2px] pr-1">Prompt</th>
              <th className="font-normal py-[2px] pr-1">Ver</th>
              <th className="font-normal py-[2px] pr-1 text-right">Score</th>
              <th className="font-normal py-[2px] pr-1 text-right">Pass@7</th>
              <th
                className="font-normal py-[2px] text-center"
                aria-label="trend"
              />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const key = `${group.prompt_id}@${group.version}`;
              const latest = group.latest || {};
              const previous = group.previous;
              const delta =
                previous && typeof previous.avg_score === 'number'
                  ? (Number(latest.avg_score) || 0) -
                    (Number(previous.avg_score) || 0)
                  : null;
              const isActive = activeKey === key;
              return (
                <tr
                  key={key}
                  onClick={() =>
                    onPick({
                      prompt_id: group.prompt_id,
                      version: group.version
                    })
                  }
                  className={`cursor-pointer hover:bg-cyan-500/[0.06] ${
                    isActive ? 'bg-cyan-500/[0.08]' : ''
                  }`}
                >
                  <td
                    className="py-[2px] pr-1 truncate text-hud-dim"
                    title={group.prompt_id}
                    style={{ maxWidth: 90 }}
                  >
                    {group.prompt_id}
                  </td>
                  <td className="py-[2px] pr-1 text-hud-dim">
                    {group.version}
                  </td>
                  <td
                    className="py-[2px] pr-1 text-right"
                    style={{ color: '#2EDBE8' }}
                  >
                    {formatScore(latest.avg_score)}
                  </td>
                  <td className="py-[2px] pr-1 text-right text-hud-dim">
                    {formatPercent(latest.pass_rate_at_seven)}
                  </td>
                  <td className="py-[2px] text-center">
                    <TrendArrow delta={delta} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {activeKey && (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="mt-1 text-[8px] uppercase tracking-[0.2em] text-cyan-500/50 hover:text-cyan-400"
        >
          Clear filter
        </button>
      )}
    </div>
  );
};

ScoreByPromptBlock.propTypes = {
  reports: PropTypes.array.isRequired,
  activeKey: PropTypes.string,
  onPick: PropTypes.func.isRequired
};

const TopWorstCasesBlock = ({ reports }) => {
  const cases = useMemo(() => extractWorstCases(reports), [reports]);

  return (
    <div className="font-mono">
      <p className="text-[8px] uppercase tracking-[0.2em] text-cyan-500/40 mb-1">
        Top 5 lowest-scoring cases
      </p>
      {cases.length === 0 ? (
        <p className="text-[10px] text-hud-dim">
          No case-level scores in current window.
        </p>
      ) : (
        <ul className="space-y-[2px]">
          {cases.map((row) => {
            const href = buildReportHtmlHref(row.filename);
            const tag = `${row.prompt_id}@${row.version}`;
            const content = (
              <div className="flex items-center justify-between text-[10px] tabular-nums">
                <span
                  className="text-hud-dim truncate"
                  style={{ maxWidth: 110 }}
                  title={row.case_id}
                >
                  {row.case_id}
                </span>
                <span
                  className="text-hud-dim truncate"
                  style={{ maxWidth: 80 }}
                >
                  {tag}
                </span>
                <span style={{ color: '#f87171' }}>
                  {formatScore(row.score)}
                </span>
              </div>
            );
            return (
              <li key={`${row.filename}:${row.case_id}`}>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:bg-cyan-500/[0.06] px-[2px]"
                  >
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

TopWorstCasesBlock.propTypes = {
  reports: PropTypes.array.isRequired
};

const HudPromptQualityPanel = ({ className = '' }) => {
  const [activeFilter, setActiveFilter] = useState(null);
  const { reports, isLoading, error, refresh } = useAgentPromptEvalReports({
    prompt_id: activeFilter?.prompt_id,
    version: activeFilter?.version
  });

  const activeKey = activeFilter
    ? `${activeFilter.prompt_id}@${activeFilter.version}`
    : null;

  const emptyState = !isLoading && !error && reports.length === 0;

  return (
    <HudPanel title="PROMPT QUALITY" className={className}>
      {isLoading && reports.length === 0 ? (
        <p className="text-[10px] font-mono text-cyan-500/40">Loading…</p>
      ) : error ? (
        <div className="font-mono">
          <p className="text-[10px] text-red-400">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-1 text-[8px] uppercase tracking-[0.2em] text-cyan-500/50 hover:text-cyan-400"
          >
            Retry
          </button>
        </div>
      ) : emptyState ? (
        <div className="font-mono space-y-1">
          <p className="text-[10px] text-hud-dim">No eval runs yet.</p>
          <p className="text-[9px] text-hud-dim leading-snug">
            Run{' '}
            <code className="text-cyan-500/70">
              python manage.py run_planner_eval
            </code>{' '}
            on the backend to capture the first one.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <HeadlineBlock reports={reports} />
          <div className="h-px bg-hud-line/20" />
          <ScoreByPromptBlock
            reports={reports}
            activeKey={activeKey}
            onPick={setActiveFilter}
          />
          <div className="h-px bg-hud-line/20" />
          <TopWorstCasesBlock reports={reports} />
        </div>
      )}
    </HudPanel>
  );
};

HudPromptQualityPanel.propTypes = {
  className: PropTypes.string
};

export default HudPromptQualityPanel;
