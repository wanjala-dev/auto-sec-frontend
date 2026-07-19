import React, { useCallback, useEffect, useState } from 'react';
import { FiActivity, FiCheck, FiX, FiWifi, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HudCard from '../../../../components/V2/HudCard';
import HudText from '../../../../components/V2/HudText';
import HexLoader from '../../../../components/V2/HexLoader';
import apiClient from '../../../../infrastructure/http/apiClient';

const fmtWhen = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

// event_code → readable label (codes are prefixed, e.g. "auth.login")
const eventLabel = (code) => {
  const c = (code || '').replace(/^auth\./, '');
  return (
    {
      login: 'Sign in',
      login_success: 'Sign in',
      logout: 'Sign out',
      login_failed: 'Failed sign-in',
      otp_verified: 'Two-factor verified',
      password_changed: 'Password changed',
      password_reset: 'Password reset',
      session_revoked: 'Session revoked'
    }[c] || (c ? c.replace(/_/g, ' ') : 'Event')
  );
};

const deviceLabel = (s) => {
  if (!s) return '';
  const bits = [s.browser, s.os].filter(Boolean).join(' · ');
  return bits || s.device_type || '';
};

/**
 * AuditSection — Settings ▸ Audit: the operator's account activity trail (sign
 * in/out, 2FA, password changes) with outcome, IP, device, and time. Reads the
 * un-gated /identity/me/login-activity. (Org-wide audit across all members is a
 * Pro-tier flag-gated surface — enabled per workspace.)
 */
export default function AuditSection() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/identity/me/login-activity/');
      const body = res?.data?.data ?? res?.data ?? {};
      const list = Array.isArray(body)
        ? body
        : body.results ?? body.data ?? [];
      setEvents(Array.isArray(list) ? list : []);
    } catch {
      toast.error('Unable to load activity.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <HexLoader size={56} label="LOADING ACTIVITY…" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <FiActivity className="text-hud-accent" size={16} />
        <HudText variant="heading" color="light">
          ACCOUNT ACTIVITY
        </HudText>
        <span className="text-[8px] font-mono text-hud-dim">
          {events.length}
        </span>
      </div>

      <HudCard bodyClassName="p-0">
        <div className="divide-y divide-cyan-500/[0.06]">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`h-5 w-5 flex items-center justify-center border ${
                    e.success === false
                      ? 'text-red-400 border-red-500/30 bg-red-500/10'
                      : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  }`}
                >
                  {e.success === false ? (
                    <FiX size={11} />
                  ) : (
                    <FiCheck size={11} />
                  )}
                </span>
                <div className="min-w-0">
                  <HudText variant="bodySmall" color="light">
                    {eventLabel(e.event_code)}
                  </HudText>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[8px] font-mono text-hud-dim">
                    <span className="flex items-center gap-1">
                      <FiWifi size={9} /> {e.ip_address || '—'}
                    </span>
                    {deviceLabel(e.session) && (
                      <span>{deviceLabel(e.session)}</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="shrink-0 flex items-center gap-1 text-[8px] font-mono text-hud-dim">
                <FiClock size={9} /> {fmtWhen(e.created_at)}
              </span>
            </div>
          ))}
          {events.length === 0 && (
            <HudText
              variant="bodySmall"
              color="muted"
              className="text-center py-6 block"
            >
              No account activity recorded yet.
            </HudText>
          )}
        </div>
      </HudCard>
    </div>
  );
}
