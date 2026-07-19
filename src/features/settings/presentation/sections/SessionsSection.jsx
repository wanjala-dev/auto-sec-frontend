import React, { useCallback, useEffect, useState } from 'react';
import { FiMonitor, FiMapPin, FiClock, FiWifi } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HudCard from '../../../../components/V2/HudCard';
import HudButton from '../../../../components/V2/HudButton';
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

const deviceLabel = (s) => {
  const bits = [s.browser, s.os].filter(Boolean).join(' · ');
  return bits || s.device_type || 'Unknown device';
};

const geoLabel = (s) =>
  [s.geo_city, s.geo_country].filter(Boolean).join(', ') || '—';

/**
 * SessionsSection — Settings ▸ Sessions: the operator's active login sessions
 * with device / location / last-seen, revoke-one, and revoke-all-others.
 */
export default function SessionsSection() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/identity/me/sessions/');
      const list = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
      setSessions(list);
    } catch {
      toast.error('Unable to load sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id) => {
    setBusyId(id);
    try {
      await apiClient.delete(`/identity/me/sessions/${id}/`);
      setSessions((s) => s.filter((x) => x.id !== id));
      toast.success('Session revoked.');
    } catch {
      toast.error('Unable to revoke that session.');
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    setRevokingOthers(true);
    try {
      await apiClient.post('/identity/me/sessions/revoke-others/', {});
      setSessions((s) => s.filter((x) => x.is_current));
      toast.success('Signed out of all other devices.');
    } catch {
      toast.error('Unable to sign out other devices.');
    } finally {
      setRevokingOthers(false);
    }
  };

  const others = sessions.filter((s) => !s.is_current);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <HexLoader size={56} label="LOADING SESSIONS…" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiMonitor className="text-hud-accent" size={16} />
          <HudText variant="heading" color="light">
            ACTIVE SESSIONS
          </HudText>
          <span className="text-[8px] font-mono text-hud-dim">
            {sessions.length}
          </span>
        </div>
        {others.length > 0 && (
          <HudButton
            variant="ghost"
            onClick={revokeOthers}
            disabled={revokingOthers}
          >
            {revokingOthers ? 'SIGNING OUT…' : 'SIGN OUT OTHERS'}
          </HudButton>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {sessions.map((s) => (
          <HudCard key={s.id} bodyClassName="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <HudText variant="bodySmall" color="light">
                    {deviceLabel(s)}
                  </HudText>
                  {s.is_current && (
                    <span className="text-[7px] font-mono font-bold tracking-wider px-1.5 py-0.5 border text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      THIS DEVICE
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-mono text-hud-dim">
                  <span className="flex items-center gap-1">
                    <FiWifi size={10} /> {s.ip_address || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <FiMapPin size={10} /> {geoLabel(s)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FiClock size={10} /> {fmtWhen(s.last_seen_at || s.created_at)}
                  </span>
                  {s.login_method && (
                    <span className="text-hud-dim">{s.login_method}</span>
                  )}
                </div>
              </div>
              {!s.is_current && (
                <button
                  type="button"
                  onClick={() => revoke(s.id)}
                  disabled={busyId === s.id}
                  className="shrink-0 text-[9px] font-mono text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 px-2 py-1 transition disabled:opacity-40"
                >
                  {busyId === s.id ? '…' : 'REVOKE'}
                </button>
              )}
            </div>
          </HudCard>
        ))}
        {sessions.length === 0 && (
          <HudText variant="bodySmall" color="muted" className="text-center py-6">
            No active sessions.
          </HudText>
        )}
      </div>
    </div>
  );
}
