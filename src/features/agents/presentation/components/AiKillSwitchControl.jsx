import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

import HudButton from '../../../../components/V2/HudButton';
import HudChip from '../../../../components/V2/HudChip';
import { agentsApi } from '../../../../infrastructure/agents/agentsApi';

/**
 * Workspace AI kill switch — the OPERATOR-panel "red button" (vision §3.4).
 *
 * Human-only by design: the backend endpoint is owner/admin-gated
 * (manage_agents) and every flip requires a typed reason that lands in the
 * audit log next to the actor + timestamp. The governance agent can REPORT
 * this state but can never touch it.
 *
 * Reuses HudButton (danger theme) + HudChip — no hand-rolled chamfer divs.
 */

export function useAiKillSwitch(workspaceId) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const r = await agentsApi.getKillSwitch(String(workspaceId));
      setStatus(r?.data || null);
    } catch {
      // Viewer may lack workspace context yet — leave status unknown; the
      // control renders nothing without a status.
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (enabled, reason) => {
      if (!workspaceId) return false;
      setToggling(true);
      try {
        const r = await agentsApi.setKillSwitch(String(workspaceId), enabled, reason);
        setStatus(r?.data || null);
        toast.success(enabled ? 'AI resumed for this workspace' : 'All AI paused for this workspace', {
          icon: enabled ? '✅' : '⛔'
        });
        return true;
      } catch (err) {
        const detail = err?.response?.data?.error;
        toast.error(detail || 'Unable to flip the AI kill switch', { icon: '⚠️' });
        return false;
      } finally {
        setToggling(false);
      }
    },
    [workspaceId]
  );

  return { status, loading, toggling, toggle, refresh };
}

const AiKillSwitchControl = ({ status, toggling, onToggle }) => {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  if (!status) return null;

  const paused = !status.ai_teammate_enabled;
  const wouldStop = status.would_stop || {};

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    const ok = await onToggle(paused, trimmed);
    if (ok) {
      setConfirming(false);
      setReason('');
    }
  };

  return (
    <div className="space-y-2 border-t border-hud-line/10 pt-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-wider text-cyan-400/60">
          AI CONTROL
        </span>
        <HudChip
          active={!paused}
          onClick={() => {}}
          activeBorder="rgba(52,211,153,0.45)"
          activeSurface="rgba(52,211,153,0.10)"
          inactiveBorder="rgba(244,63,94,0.55)"
          inactiveSurface="rgba(244,63,94,0.12)"
          className={paused ? 'text-rose-300' : 'text-emerald-300'}
        >
          {paused ? 'AI PAUSED' : 'AI ACTIVE'}
        </HudChip>
      </div>

      {!confirming && (
        <HudButton
          variant="primary"
          theme={paused ? 'ocean' : 'danger'}
          fullWidth
          disabled={toggling}
          onClick={() => setConfirming(true)}
        >
          {paused ? 'RESUME AI' : 'PAUSE ALL AI'}
        </HudButton>
      )}

      {confirming && (
        <div className="space-y-2">
          <p className="font-mono text-[9px] leading-[1.5] text-hud-dim">
            {paused
              ? 'Resuming restarts chat, deep runs and the scheduled detector cycle. A reason is required — it is written to the audit log with your name.'
              : `Pausing stops ${wouldStop.active_agents ?? 0} active agent${(wouldStop.active_agents ?? 0) === 1 ? '' : 's'}, refuses new chat/deep runs, and halts the scheduled detector cycle. A reason is required — it is written to the audit log with your name.`}
          </p>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder={paused ? 'Reason for resuming…' : 'Reason for pausing…'}
            autoFocus
            className="w-full border border-hud-line/20 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-hud-text placeholder-gray-600 outline-none focus:border-hud-accent/40"
          />
          <div className="flex gap-2">
            <HudButton
              variant="primary"
              theme={paused ? 'ocean' : 'danger'}
              disabled={toggling || !reason.trim()}
              onClick={submit}
              className="flex-1"
            >
              {toggling ? 'APPLYING…' : paused ? 'CONFIRM RESUME' : 'CONFIRM PAUSE'}
            </HudButton>
            <HudButton
              variant="ghost"
              disabled={toggling}
              onClick={() => {
                setConfirming(false);
                setReason('');
              }}
            >
              CANCEL
            </HudButton>
          </div>
        </div>
      )}

      {paused && (
        <p className="font-mono text-[9px] leading-[1.5] text-rose-300/70">
          Chat, deep runs and detector cycles are refused while paused. The AI
          governance agent can still report this state but cannot flip it.
        </p>
      )}
    </div>
  );
};

AiKillSwitchControl.propTypes = {
  status: PropTypes.shape({
    ai_teammate_enabled: PropTypes.bool,
    would_stop: PropTypes.object
  }),
  toggling: PropTypes.bool,
  onToggle: PropTypes.func.isRequired
};

export default AiKillSwitchControl;
