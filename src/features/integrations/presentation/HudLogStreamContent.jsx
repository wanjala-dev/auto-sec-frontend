import React, { useCallback, useEffect, useRef, useState } from 'react';
import HexLoader from '../../../components/V2/HexLoader';
import PropTypes from 'prop-types';

import apiClient from '../../../infrastructure/http/apiClient';
import { useSeedContext } from '../../seed/presentation/SeedContext';
import { resolveStoredSummaryWorkspaceId } from '../../../domain/auth/storedSummarySelectors';
import { readViewerStoredUserSummary } from '../../auth/presentation/browserAuthSessionSupport';

const LEVEL_C = {
  ERROR: '#E84D8A',
  CRITICAL: '#ff3b52',
  FATAL: '#ff3b52',
  WARNING: '#F59E0B',
  WARN: '#F59E0B'
};

// Default cadence: display the logs and quietly refresh every 3 minutes.
const AUTO_MS = 180_000;
// LIVE STREAM cadence: operator explicitly went live — poll every 30s (the
// backend caches the payload 60s per connection, so this stays cheap).
const LIVE_MS = 30_000;

/**
 * HudLogStreamContent — the SIEM log stream, in two variants:
 *
 * - `variant="card"` — the compact homepage card (last 40 lines, tiny type).
 * - `variant="full"` — the full-window LOGS drawer that slides down from the
 *   top nav (same interaction as KANBAN; the whole 80-record tail).
 *
 * Logs display by default and auto-refresh every 3 minutes. The LIVE STREAM
 * button (top right) switches to a 30s cadence for active watching; pressing
 * it again drops back to auto. The tail stays pinned to the newest records so
 * fresh lines visibly flow in from the bottom.
 */
export default function HudLogStreamContent({ variant = 'card', fill = false }) {
  const { seed } = useSeedContext();
  const workspaceId =
    seed?.id ||
    seed?.pk ||
    resolveStoredSummaryWorkspaceId(readViewerStoredUserSummary()) ||
    null;

  const [records, setRecords] = useState([]);
  const [byService, setByService] = useState({});
  const [meta, setMeta] = useState(null); // {parsed, errors, newestKey}
  const [state, setState] = useState('loading'); // loading|live|none|error
  const [live, setLive] = useState(false);
  const connRef = useRef(null);
  const endRef = useRef(null);
  const isFull = variant === 'full';

  const poll = useCallback(async () => {
    if (!workspaceId) return;
    try {
      if (!connRef.current) {
        const r = await apiClient.get(`/integrations/workspaces/${workspaceId}/aws/`);
        const conns = r?.data?.data || [];
        const conn = conns.find((c) => c.status === 'connected') || conns[0];
        if (!conn) {
          setState('none');
          return;
        }
        connRef.current = conn.id;
      }
      const r = await apiClient.get(
        `/integrations/workspaces/${workspaceId}/aws/${connRef.current}/logstream/`
      );
      const data = r?.data?.data || {};
      setRecords(data.records || []);
      setByService(data.by_service || {});
      setMeta({
        parsed: data.records_parsed,
        errors: data.errors,
        newestKey: data.newest_key
      });
      setState('live');
      // Broadcast the detection signal so the command-center ring (Anomalies
      // hex glitch + its error list) reacts without running its own poll.
      window.dispatchEvent(
        new CustomEvent('autosec:logstream', {
          detail: {
            errors: data.errors || 0,
            errorRecords: data.error_records || []
          }
        })
      );
    } catch {
      setState((s) => (s === 'live' ? 'live' : 'error'));
    }
  }, [workspaceId]);

  // Fetch on mount; interval follows the mode (3min auto / 30s live).
  useEffect(() => {
    poll();
    const t = setInterval(poll, live ? LIVE_MS : AUTO_MS);
    return () => clearInterval(t);
  }, [poll, live]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [records]);

  const modeButton = (compact) => (
    <button
      type="button"
      onClick={() => setLive((v) => !v)}
      title={live ? 'Back to auto-refresh (3 min)' : 'Poll every 30s'}
      className={`border px-1.5 py-0.5 font-mono tracking-[0.15em] transition ${
        compact ? 'text-[7px]' : 'text-[9px] px-2'
      } ${
        live
          ? 'border-emerald-400/40 text-emerald-400 hover:text-rose-400 hover:border-rose-400/40'
          : 'border-hud-line/20 text-hud-dim hover:text-hud-accent'
      }`}
    >
      {live ? '■ LIVE' : '▶ LIVE STREAM'}
    </button>
  );

  if (state === 'none') {
    return (
      <p className={`px-1 py-2 font-mono text-hud-dim ${isFull ? 'text-center text-[9px]' : 'text-[8px]'}`}>
        No AWS source connected — Settings ▸ Integrations.
      </p>
    );
  }
  if (state === 'error') {
    return (
      <p className={`px-1 py-2 font-mono text-rose-400/80 ${isFull ? 'text-center text-[9px]' : 'text-[8px]'}`}>
        Log source unreachable — retrying…
      </p>
    );
  }

  // ── Compact card ──
  if (!isFull) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-0.5 flex items-center justify-between">
          <span className="font-mono text-[7px] tracking-[0.2em] text-hud-dim">
            {live ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                LIVE 30S
              </span>
            ) : (
              'AUTO · 3 MIN'
            )}
          </span>
          {modeButton(true)}
        </div>
        <div
          className={
            // When the card is user-resized (fill), the panel's own height is
            // the constraint — drop the default cap so the tail fills it.
            fill ? 'min-h-0 flex-1 overflow-hidden' : 'max-h-[20vh] flex-1 overflow-hidden'
          }
        >
          <div className="flex h-full flex-col justify-end overflow-y-auto cc-scrollbar">
            {state === 'loading' && (
              <div className="flex items-center gap-2 py-1">
                <HexLoader size={22} />
                <p className="font-mono text-[8px] text-hud-dim">
                  CONNECTING TO STREAM…
                </p>
              </div>
            )}
            {records.slice(-40).map((r, i) => (
              <p key={i} className="truncate font-mono text-[8px] leading-[1.5] text-hud-dim">
                <span className="text-hud-accent/70">[{r.service}]</span>{' '}
                <span
                  style={{ color: LEVEL_C[r.level] || 'rgb(var(--hud-dim))' }}
                  className="font-bold"
                >
                  {r.level}
                </span>{' '}
                <span className="text-hud-text/80">{r.message}</span>
              </p>
            ))}
            <div ref={endRef} />
          </div>
        </div>
        {meta && (
          <div className="mt-1 flex items-center justify-between border-t border-hud-line/10 pt-1 font-mono text-[7px] text-hud-dim">
            <span>{meta.parsed} RECORDS / WINDOW</span>
            <span style={{ color: meta.errors ? '#E84D8A' : '#34d399' }}>
              {meta.errors ? `${meta.errors} ERRORS` : 'HEALTHY'}
            </span>
          </div>
        )}
      </div>
    );
  }

  // ── Full-window drawer ──
  return (
    <div className="flex flex-col px-4 py-2">
      {/* Header row: refresh mode + per-service counts, LIVE STREAM top right */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] text-hud-accent">
            {live ? (
              <>
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                LIVE · 30S
              </>
            ) : (
              'AUTO · 3 MIN'
            )}
          </span>
          {Object.entries(byService).map(([svc, n]) => (
            <span key={svc} className="truncate font-mono text-[8px] text-hud-dim">
              {svc}:{n}
            </span>
          ))}
        </div>
        {modeButton(false)}
      </div>

      {/* The stream — grows with content up to the drawer max, then scrolls
          pinned to the tail. No fixed height, so a short window leaves no
          empty frame above the logs. */}
      <div className="border-t border-hud-line/10">
        <div className="max-h-[62vh] overflow-y-auto cc-scrollbar pt-1">
          {state === 'loading' && (
            <div className="flex w-full justify-center py-6">
              <HexLoader size={56} label="CONNECTING TO STREAM" />
            </div>
          )}
          {records.map((r, i) => (
            <p key={i} className="truncate font-mono text-[9px] leading-[1.6] text-hud-dim">
              <span className="text-hud-accent/70">[{r.service}]</span>{' '}
              <span
                style={{ color: LEVEL_C[r.level] || 'rgb(var(--hud-dim))' }}
                className="font-bold"
              >
                {r.level}
              </span>{' '}
              <span className="text-hud-text/80">{r.message}</span>
            </p>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* Meta footer */}
      {meta && (
        <div className="mt-1 flex items-center justify-between border-t border-hud-line/10 pt-1 font-mono text-[8px] text-hud-dim">
          <span>{meta.parsed} RECORDS / WINDOW</span>
          <span className="max-w-[40%] truncate" title={meta.newestKey}>
            {meta.newestKey}
          </span>
          <span style={{ color: meta.errors ? '#E84D8A' : '#34d399' }}>
            {meta.errors ? `${meta.errors} ERRORS` : 'HEALTHY'}
          </span>
        </div>
      )}
    </div>
  );
}

HudLogStreamContent.propTypes = {
  variant: PropTypes.oneOf(['card', 'full']),
  fill: PropTypes.bool
};
