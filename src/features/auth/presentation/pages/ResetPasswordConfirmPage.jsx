import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-toastify';

import AuthShell from '../../../../components/V2/AuthShell';
import HudInput from '../../../../components/V2/HudInput';
import HudButton from '../../../../components/V2/HudButton';
import apiClient from '../../../../infrastructure/http/apiClient';

/**
 * Reset-password confirm — the page the reset email links to
 * (/identity/password-reset-confirm/<uidb64>/<token>/). New password → POST
 * /identity/password-reset-complete → success screen. HUD-native via AuthShell.
 */
export default function ResetPasswordConfirmPage() {
  const navigate = useNavigate();
  const { uidb64, token } = useParams();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setFailed(false);
    if (pw.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pw !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await apiClient.patch('/identity/password-reset-complete', {
        password: pw,
        token,
        uidb64
      });
      toast.success('Password updated. You can sign in now.');
      navigate('/identity/reset-password-success', { replace: true });
    } catch (err) {
      setFailed(true);
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.password?.[0] ||
          'This reset link is invalid or has expired. Request a new one.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="RESET PASSWORD"
      subtitle="SET A NEW PASSWORD FOR YOUR ACCOUNT"
      status={busy ? 'busy' : failed ? 'error' : 'idle'}
      footer={
        <button
          type="button"
          onClick={() => navigate('/identity/login')}
          className="text-[10px] font-mono text-gray-600 hover:text-cyan-400 transition"
        >
          ← Back to sign in
        </button>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <HudInput
          icon={<FiLock size={14} />}
          type={show ? 'text' : 'password'}
          placeholder="New password"
          autoComplete="new-password"
          autoFocus
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            if (error) setError('');
          }}
          suffix={
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="text-gray-600 hover:text-cyan-400 transition"
            >
              {show ? <FiEyeOff size={14} /> : <FiEye size={14} />}
            </button>
          }
        />
        <HudInput
          icon={<FiLock size={14} />}
          type={show ? 'text' : 'password'}
          placeholder="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (error) setError('');
          }}
          error={error}
        />
        <HudButton
          variant="primary"
          fullWidth
          type="submit"
          disabled={busy}
          glitch={failed}
        >
          {busy ? 'UPDATING…' : 'UPDATE PASSWORD'}
        </HudButton>
      </form>
    </AuthShell>
  );
}
