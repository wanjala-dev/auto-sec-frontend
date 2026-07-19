import React, { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FiShield, FiKey, FiLock } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HudCard from '../../../../components/V2/HudCard';
import HudButton from '../../../../components/V2/HudButton';
import HudText from '../../../../components/V2/HudText';
import HudInput from '../../../../components/V2/HudInput';
import HexLoader from '../../../../components/V2/HexLoader';
import apiClient from '../../../../infrastructure/http/apiClient';

/** Pull the otpauth secret out of the provisioning URI for manual entry. */
const secretFromOtpauth = (url) => {
  try {
    return new URLSearchParams(url.split('?')[1]).get('secret') || '';
  } catch {
    return '';
  }
};

/**
 * SecuritySection — the Settings ▸ Security surface: two-factor authentication.
 * Enable (QR + verify), disable, and recovery codes. HUD-native.
 */
export default function SecuritySection() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Setup flow
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  // Recovery codes
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/identity/me/summary/');
      const user = res?.data?.data?.user ?? res?.data?.user ?? {};
      setEnabled(user.two_factor_enabled === true);
    } catch {
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    setBusy(true);
    setCodeError('');
    try {
      const res = await apiClient.get('/identity/otp/create/');
      setOtpauthUrl(res?.data?.otpauth_url || '');
    } catch {
      toast.error('Unable to start 2FA setup.');
    } finally {
      setBusy(false);
    }
  };

  const verifySetup = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setCodeError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setCodeError('');
    try {
      await apiClient.post('/identity/otp/verify/', { token: code.trim() });
      toast.success('Two-factor authentication enabled.');
      setOtpauthUrl('');
      setCode('');
      setEnabled(true);
    } catch (err) {
      setCodeError(
        err?.response?.data?.detail ||
          'That code was not valid. Try the current one.'
      );
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await apiClient.post('/identity/otp/delete/', {});
      toast.success('Two-factor authentication disabled.');
      setEnabled(false);
      setRecoveryCodes([]);
    } catch {
      toast.error('Unable to disable 2FA.');
    } finally {
      setBusy(false);
    }
  };

  const genRecovery = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiClient.post('/identity/otp/static/create/', {
        password: recoveryPassword
      });
      const codes = res?.data?.codes || res?.data?.tokens || res?.data || [];
      setRecoveryCodes(Array.isArray(codes) ? codes : []);
      setRecoveryPassword('');
      if (!codes?.length) toast.info('No recovery codes returned.');
    } catch {
      toast.error('Unable to generate recovery codes (check your password).');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <HexLoader size={56} label="LOADING SECURITY…" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <FiShield className="text-hud-accent" size={16} />
        <HudText variant="heading" color="light">
          TWO-FACTOR AUTHENTICATION
        </HudText>
        <span
          className={`text-[8px] font-mono font-bold tracking-wider px-2 py-0.5 border ${
            enabled
              ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
              : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
          }`}
        >
          {enabled ? 'ENABLED' : 'DISABLED'}
        </span>
      </div>

      {enabled ? (
        <HudCard bodyClassName="p-5">
          <div className="flex flex-col gap-4">
            <HudText variant="bodySmall" color="muted">
              Your account is protected with an authenticator app. Keep recovery
              codes somewhere safe in case you lose your device.
            </HudText>

            {recoveryCodes.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((c) => (
                  <code
                    key={c}
                    className="text-[11px] font-mono text-hud-accent bg-hud-surface/40 border border-hud-line/15 px-2 py-1 text-center tracking-wider"
                  >
                    {c}
                  </code>
                ))}
              </div>
            ) : (
              <form onSubmit={genRecovery} className="flex flex-col gap-2">
                <HudText variant="caption" color="dim">
                  Confirm your password to generate recovery codes.
                </HudText>
                <HudInput
                  icon={<FiLock size={14} />}
                  type="password"
                  placeholder="Current password"
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                />
                <div className="flex gap-2">
                  <HudButton variant="secondary" type="submit" disabled={busy}>
                    {busy ? 'GENERATING…' : 'GENERATE RECOVERY CODES'}
                  </HudButton>
                </div>
              </form>
            )}

            <div>
              <HudButton
                variant="ghost"
                onClick={disable}
                disabled={busy}
                theme="default"
              >
                DISABLE 2FA
              </HudButton>
            </div>
          </div>
        </HudCard>
      ) : otpauthUrl ? (
        <HudCard bodyClassName="p-5">
          <div className="flex flex-col gap-4 items-center text-center">
            <HudText variant="bodySmall" color="muted">
              Scan this with your authenticator app, then enter the 6-digit code.
            </HudText>
            <div className="bg-white p-2">
              <QRCodeSVG value={otpauthUrl} size={148} />
            </div>
            <HudText variant="tiny" color="dim" className="break-all">
              or enter manually: {secretFromOtpauth(otpauthUrl)}
            </HudText>
            <form onSubmit={verifySetup} className="w-full flex flex-col gap-3">
              <HudInput
                icon={<FiKey size={14} />}
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (codeError) setCodeError('');
                }}
                error={codeError}
              />
              <HudButton
                variant="primary"
                fullWidth
                type="submit"
                disabled={busy}
              >
                {busy ? 'VERIFYING…' : 'VERIFY & ENABLE'}
              </HudButton>
            </form>
          </div>
        </HudCard>
      ) : (
        <HudCard bodyClassName="p-5">
          <div className="flex flex-col gap-4">
            <HudText variant="bodySmall" color="muted">
              Add a second factor from an authenticator app (Google
              Authenticator, 1Password, Authy) for stronger account security.
            </HudText>
            <div>
              <HudButton variant="primary" onClick={startSetup} disabled={busy}>
                {busy ? 'STARTING…' : 'ENABLE 2FA'}
              </HudButton>
            </div>
          </div>
        </HudCard>
      )}
    </div>
  );
}
