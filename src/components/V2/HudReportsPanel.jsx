import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import apiClient from '../../infrastructure/http/apiClient';
import { reportsApi } from '../../infrastructure/reports/reportsApi';
import { resolveStoredMembershipRole } from '../../domain/auth/storedSummarySelectors';
import { useViewerSession } from '../../features/auth/presentation/useViewerSession';
import HexLoader from './HexLoader';
import HudButton from './HudButton';
import HudCard from './HudCard';
import HudChip from './HudChip';
import HudSelect from './HudSelect';
import HudPdfPreviewModal from './HudPdfPreviewModal';

/**
 * Reports surface — a kind picker (pentest today), a Generate action, a list of
 * past reports with status chips, an Approve action (owner/admin), and a
 * Download PDF button (enabled once approved). Mirrors the POSTURE panel's
 * fetch → HexLoader → HudCard-list shape; all chrome is HUD components.
 *
 * Backend: the `report` bounded context (draft → generating → generated →
 * approved → download), via ``reportsApi``.
 */

const STATUS_CHIP = {
  draft: {
    border: 'rgba(251, 146, 60, 0.4)',
    surface: 'rgba(251, 146, 60, 0.08)',
    text: 'text-amber-400'
  },
  generating: {
    border: 'rgba(46, 219, 232, 0.45)',
    surface: 'rgba(46, 219, 232, 0.10)',
    text: 'text-cyan-400'
  },
  generated: {
    border: 'rgba(52, 211, 153, 0.45)',
    surface: 'rgba(52, 211, 153, 0.10)',
    text: 'text-emerald-400'
  },
  approved: {
    border: 'rgba(52, 211, 153, 0.55)',
    surface: 'rgba(52, 211, 153, 0.12)',
    text: 'text-emerald-300'
  },
  failed: {
    border: 'rgba(248, 113, 113, 0.5)',
    surface: 'rgba(248, 113, 113, 0.10)',
    text: 'text-red-400'
  }
};

const ACTIVE_STATUSES = new Set(['draft', 'generating']);

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
};

export default function HudReportsPanel({ seedId }) {
  const { storedSummary } = useViewerSession();
  const canApprove = useMemo(() => {
    const role = resolveStoredMembershipRole(storedSummary);
    return role === 'owner' || role === 'admin';
  }, [storedSummary]);

  const [kinds, setKinds] = useState([]);
  const [selectedKind, setSelectedKind] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approvingId, setApprovingId] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const [error, setError] = useState('');
  const [previewReport, setPreviewReport] = useState(null);

  // ── Load kinds once ──
  useEffect(() => {
    let active = true;
    reportsApi
      .getKinds()
      .then((res) => {
        if (!active) return;
        const list = res?.data?.kinds || [];
        setKinds(list);
        if (list.length > 0) setSelectedKind((k) => k || list[0].id);
      })
      .catch(() => {
        /* kinds are non-critical; the generate button just stays disabled */
      });
    return () => {
      active = false;
    };
  }, []);

  // ── Load reports (with poll while any report is still generating) ──
  const fetchReports = useCallback(async () => {
    if (!seedId) return;
    try {
      const res = await reportsApi.list(seedId);
      setReports(res?.data?.results || []);
      setError('');
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to load reports.'
      );
    } finally {
      setLoading(false);
    }
  }, [seedId]);

  useEffect(() => {
    if (!seedId) return undefined;
    setLoading(true);
    fetchReports();
    const interval = setInterval(() => {
      // Only poll while something is in flight — otherwise this is idle.
      setReports((current) => {
        if (current.some((r) => ACTIVE_STATUSES.has(r.status))) fetchReports();
        return current;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [seedId, fetchReports]);

  // ── Generate ──
  const handleGenerate = async () => {
    if (!selectedKind || !seedId) return;
    setGenerating(true);
    setError('');
    try {
      await reportsApi.generate(seedId, { kind: selectedKind });
      await fetchReports();
    } catch (err) {
      setError(
        err?.response?.data?.detail || 'Failed to start report generation.'
      );
    } finally {
      setGenerating(false);
    }
  };

  // ── Approve (owner/admin) ──
  const handleApprove = async (reportId) => {
    setApprovingId(reportId);
    setError('');
    try {
      await reportsApi.approve(reportId, seedId);
      await fetchReports();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to approve report.');
    } finally {
      setApprovingId('');
    }
  };

  // ── Download (blob so the JWT-gated redirect is followed with auth) ──
  const handleDownload = async (report) => {
    setDownloadingId(report.id);
    setError('');
    try {
      const res = await apiClient.get(`/report/${report.id}/download/`, {
        params: { workspace: seedId },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(report.title || 'report').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to download the PDF.');
    } finally {
      setDownloadingId('');
    }
  };

  if (!seedId) {
    return (
      <div className="flex h-40 items-center justify-center">
        <span className="font-mono text-[10px] tracking-[0.15em] text-hud-dim">
          SELECT A WORKSPACE TO LOAD ITS REPORTS
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-1">
      {/* ── Generate bar ── */}
      <HudCard size="sm" bodyClassName="p-3">
        <div className="flex items-end gap-3">
          <HudSelect
            value={selectedKind}
            onChange={setSelectedKind}
            label="REPORT TYPE"
            placeholder="Select a report type…"
            options={kinds.map((k) => ({ value: k.id, label: k.title }))}
            className="flex-1"
            selectClassName="min-w-[12rem]"
          />
          <HudButton
            variant="primary"
            theme="ocean"
            onClick={handleGenerate}
            disabled={!selectedKind || generating}
          >
            {generating ? '⟳ GENERATING' : '▶ GENERATE REPORT'}
          </HudButton>
        </div>
      </HudCard>

      {error ? (
        <HudCard size="sm" border="amber" bodyClassName="p-3">
          <p className="font-mono text-[10px] text-amber-400">{error}</p>
          <button
            type="button"
            onClick={fetchReports}
            className="mt-1 font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-500/60 hover:text-cyan-400"
          >
            Retry
          </button>
        </HudCard>
      ) : null}

      {/* ── Reports list ── */}
      {loading && reports.length === 0 ? (
        <div className="flex h-52 items-center justify-center">
          <HexLoader size={110} label="LOADING REPORTS" />
        </div>
      ) : reports.length === 0 ? (
        <HudCard size="sm" bodyClassName="p-6">
          <p className="text-center font-mono text-[10px] tracking-[0.15em] text-hud-dim">
            NO REPORTS YET — GENERATE ONE FROM THE FINDINGS ON THE BOARD
          </p>
        </HudCard>
      ) : (
        <div className="space-y-1.5">
          {reports.map((report) => {
            const chip = STATUS_CHIP[report.status] || STATUS_CHIP.draft;
            const inFlight = ACTIVE_STATUSES.has(report.status);
            return (
              <HudCard
                key={report.id}
                size="sm"
                bodyClassName="p-3 flex items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] text-hud-text">
                    {report.title}
                  </p>
                  <p className="font-mono text-[8px] tracking-[0.12em] text-hud-dim">
                    {report.finding_count} FINDING
                    {report.finding_count === 1 ? '' : 'S'} ·{' '}
                    {formatDate(report.created_at)}
                    {report.narrative_faithful === false
                      ? ' · ⚠ NARRATIVE FLAGGED'
                      : ''}
                  </p>
                </div>

                {inFlight ? (
                  <HexLoader size={22} speed={1.4} />
                ) : null}

                <HudChip
                  active
                  className={chip.text}
                  activeBorder={chip.border}
                  activeSurface={chip.surface}
                >
                  {report.status.toUpperCase()}
                </HudChip>

                {report.status === 'generated' ||
                report.status === 'approved' ? (
                  <HudButton
                    variant="ghost"
                    onClick={() => setPreviewReport(report)}
                  >
                    👁 PREVIEW
                  </HudButton>
                ) : null}

                {report.status === 'generated' && canApprove ? (
                  <HudButton
                    variant="secondary"
                    onClick={() => handleApprove(report.id)}
                    disabled={approvingId === report.id}
                  >
                    {approvingId === report.id ? '⟳' : '✓ APPROVE'}
                  </HudButton>
                ) : null}

                {report.status === 'approved' ? (
                  <HudButton
                    variant="ghost"
                    onClick={() => handleDownload(report)}
                    disabled={downloadingId === report.id}
                  >
                    {downloadingId === report.id ? '⟳' : '⬇ PDF'}
                  </HudButton>
                ) : null}
              </HudCard>
            );
          })}
        </div>
      )}

      {previewReport ? (
        <HudPdfPreviewModal
          report={previewReport}
          seedId={seedId}
          onClose={() => setPreviewReport(null)}
        />
      ) : null}
    </div>
  );
}

HudReportsPanel.propTypes = {
  seedId: PropTypes.string
};

HudReportsPanel.defaultProps = {
  seedId: ''
};
