import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AuthShell from '../../../../components/V2/AuthShell';
import HudButton from '../../../../components/V2/HudButton';
import HudText from '../../../../components/V2/HudText';
import HexLoader from '../../../../components/V2/HexLoader';
import apiClient from '../../../../infrastructure/http/apiClient';

/**
 * Email confirmation — the page the verification email links to
 * (<frontend>/identity/email-confirm?token=…). Verifies the token against
 * /identity/email-verify/ and reports verified / failed. HUD-native.
 */
export default function EmailConfirmPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | ok | fail
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setStatus('fail');
      setMessage('Missing verification token.');
      return;
    }
    apiClient
      .get(`/identity/email-verify/?token=${encodeURIComponent(token)}`)
      .then(() => {
        setStatus('ok');
        setMessage('Your email is verified. You can sign in now.');
      })
      .catch((err) => {
        setStatus('fail');
        setMessage(
          err?.response?.data?.error ||
            err?.response?.data?.detail ||
            'This verification link is invalid or has expired.'
        );
      });
  }, [token]);

  const shellStatus =
    status === 'verifying' ? 'busy' : status === 'fail' ? 'error' : 'idle';

  return (
    <AuthShell
      title={
        status === 'verifying'
          ? 'VERIFYING'
          : status === 'ok'
          ? 'EMAIL VERIFIED'
          : 'VERIFICATION FAILED'
      }
      subtitle={status === 'verifying' ? 'CONFIRMING YOUR ADDRESS' : undefined}
      status={shellStatus}
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
      <div className="flex flex-col gap-5 items-center text-center">
        {status === 'verifying' ? (
          <HexLoader size={56} label="VERIFYING…" />
        ) : (
          <React.Fragment>
            <HudText
              variant="bodySmall"
              color={status === 'ok' ? 'light' : 'red'}
            >
              {message}
            </HudText>
            {status === 'ok' && (
              <HudButton
                variant="primary"
                fullWidth
                onClick={() => navigate('/identity/login', { replace: true })}
              >
                SIGN IN
              </HudButton>
            )}
          </React.Fragment>
        )}
      </div>
    </AuthShell>
  );
}
