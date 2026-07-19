import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiKey,
  FiUser
} from 'react-icons/fi';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';

import StarField from '../../../../components/V2/StarField';
import HudButton from '../../../../components/V2/HudButton';
import HudText from '../../../../components/V2/HudText';
import HudTabs from '../../../../components/V2/HudTabs';
import HudCard from '../../../../components/V2/HudCard';
import HudInput from '../../../../components/V2/HudInput';
import GlitchHex from '../../../../components/V2/GlitchHex';
import { useAuthContext } from '../LoginAuthContext';
import apiClient from '../../../../infrastructure/http/apiClient';
import { isValidEmail } from '../../../../shared/validation/emailValidation';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const MODES = { login: 'SIGN IN', register: 'REGISTER', reset: 'RESET' };

/**
 * AUTO-SEC auth shell — the HUD auth gate on /identity/login. Login (password +
 * Google + remember-me), Register (+ terms), and Reset (forgot password). On a
 * successful login a JWT is written to storage by the auth session presentation
 * and every data endpoint stops 401ing.
 *
 * Reuses the V2 HUD design system (autosec-v2-hud skill) and the already-present
 * auth Context (useAuthContext → login / login_google / reset / update*). No
 * redux, no brand-kit closure.
 */
export default function AutoSecLoginPage() {
  const navigate = useNavigate();
  const {
    loading,
    email,
    password,
    fail,
    error_message,
    isAuthenticated,
    updateEmail,
    updatePassword,
    login,
    login_google,
    verifyOtpLogin,
    clearOtpLogin,
    show_error
  } = useAuthContext();

  const [mode, setMode] = useState('login');
  const [rememberMe, setRememberMe] = useState(true);
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [regEmailError, setRegEmailError] = useState('');
  // Password visibility is LOCAL and defaults to hidden — never rely on the
  // auth context's `hidden` (its reducer inits to {} so `hidden` is undefined =
  // falsy = plaintext, an anti-pattern that shows the password by default).
  const [showPw, setShowPw] = useState(false);

  // Register-local state (register uses its own endpoint).
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [regNotice, setRegNotice] = useState('');
  const [regError, setRegError] = useState('');

  // Reset-local state.
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const hasToken =
      typeof window !== 'undefined' && !!localStorage.getItem('token');
    if (isAuthenticated || hasToken) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const goHome = () => navigate('/', { replace: true });

  // Subtle inline validation — reuses the shared isValidEmail util (never a
  // component-local regex); futuristic HUD copy, soft red hairline (not the loud
  // glitch, which is reserved for a server-rejected sign-in).
  const emailErrorFor = (v) => (isValidEmail(v) ? '' : 'INVALID EMAIL FORMAT');

  // "Keep me logged in": when unchecked, drop the long-lived refresh token so
  // the session can't silently outlive the short access token (real behaviour,
  // not a decorative checkbox).
  const applyRememberMe = () => {
    if (!rememberMe) {
      try {
        localStorage.removeItem('token_refresh');
      } catch {
        /* private mode */
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginFailed(false);
    try {
      const result = await login();
      if (result?.otpRequired) {
        setOtpMode(true);
        return;
      }
      if (localStorage.getItem('token')) {
        applyRememberMe();
        goHome();
        return;
      }
      // No token, no OTP → auth failed: fire the glitch feedback.
      setLoginFailed(true);
    } catch {
      setLoginFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await verifyOtpLogin?.({ token: otpCode, method: 'totp' });
      if (result && !result.otpRequired && localStorage.getItem('token')) {
        applyRememberMe();
        goHome();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) return;
    setSubmitting(true);
    try {
      const result = await login_google?.(credential);
      if (result?.otpRequired) {
        setOtpMode(true);
        return;
      }
      if (localStorage.getItem('token')) {
        applyRememberMe();
        goHome();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegNotice('');
    if (!agreeTerms) {
      setRegError('Please accept the Terms & Conditions to continue.');
      return;
    }
    setSubmitting(true);
    try {
      // RegisterSerializer fields: email, username, password. The backend
      // requires an ALPHANUMERIC username, so strip anything else from the email
      // local-part (emails with +/./- would otherwise 400). Backend sends the
      // verification email.
      const username =
        (regEmail.split('@')[0] || regEmail)
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 150) || `user${Date.now()}`;
      await apiClient.post('/identity/register/', {
        email: regEmail,
        username,
        password: regPassword,
        first_name: regName
      });
      const notice =
        'Account created. Check your email to verify your address, then sign in.';
      setRegNotice(notice);
      toast.success(notice);
      setMode('login');
      updateEmail?.(regEmail);
    } catch (err) {
      const data = err?.response?.data;
      const msg =
        data?.email?.[0] ||
        data?.password?.[0] ||
        data?.username?.[0] ||
        data?.detail ||
        'Registration failed. Please try again.';
      setRegError(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Call the endpoint directly rather than the shared reset() — reset()
      // hard-redirects to /identity/reset-confirm/<email>, a route we haven't
      // built yet, so it would bounce to login. Staying on-page with a neutral
      // confirmation is also better UX (and avoids email enumeration).
      await apiClient.post('/identity/request-reset-email/', {
        email: resetEmail
      });
    } catch {
      /* swallow — never leak whether the email exists */
    } finally {
      setResetSent(true);
      setSubmitting(false);
    }
  };

  const busy = loading || submitting;

  const switchMode = (next) => {
    setMode(next);
    setOtpMode(false);
    setRegError('');
    setLoginFailed(false);
    show_error?.('', false);
  };

  return (
    <div className="fixed inset-0 bg-[#050814] overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0">
        <StarField count={200} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Wordmark — the logo lives inside a hexagon that glitch-pulses cyan
            while authenticating and red on failure (reuses the dashboard alert
            animation via GlitchHex); calm hex outline at rest. */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-28 w-28 mb-4 flex items-center justify-center">
            <GlitchHex
              size={112}
              color={loginFailed ? '#ff3b52' : '#2EDBE8'}
              active={busy || loginFailed}
            />
            <span
              className={`absolute text-[36px] ${
                loginFailed ? 'text-red-400' : 'text-cyan-400'
              }`}
            >
              ◉
            </span>
          </div>
          <HudText
            variant="title"
            color={loginFailed ? 'red' : 'cyan'}
            className="tracking-[0.28em]"
          >
            {busy ? 'LOGGING IN' : loginFailed ? 'ACCESS DENIED' : 'AUTO-SEC'}
          </HudText>
          <HudText
            variant="caption"
            color="cyan-muted"
            className="mt-1 tracking-[0.3em]"
          >
            {busy ? 'AUTHENTICATING…' : 'AUTOMATIC SECURITY'}
          </HudText>
        </div>

        <HudCard surface="bg-black/50 backdrop-blur-xl" bodyClassName="p-8">
          {/* Mode tabs — reusable V2 HudTabs, not a one-off strip */}
          {!otpMode && (
            <HudTabs
              className="mb-6"
              activeId={mode}
              onChange={switchMode}
              tabs={Object.entries(MODES).map(([id, label]) => ({ id, label }))}
            />
          )}

          {/* ── OTP (2FA) ── */}
          {otpMode ? (
            <form onSubmit={handleOtp} className="flex flex-col gap-4">
              <HudText variant="bodySmall" color="light">
                Two-factor required — enter your authenticator code.
              </HudText>
              <HudInput
                icon={<FiKey size={14} />}
                type="text"
                inputMode="numeric"
                placeholder="123456"
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
              {fail && error_message && (
                <p className="text-[11px] font-mono text-red-400">
                  {error_message}
                </p>
              )}
              <HudButton variant="primary" fullWidth type="submit" disabled={busy}>
                {busy ? 'VERIFYING…' : 'VERIFY'}
              </HudButton>
              <LinkButton
                onClick={() => {
                  clearOtpLogin?.();
                  setOtpMode(false);
                  setOtpCode('');
                }}
              >
                ← Back
              </LinkButton>
            </form>
          ) : mode === 'login' ? (
            /* ── LOGIN ── */
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <HudInput
                icon={<FiMail size={14} />}
                type="email"
                placeholder="Email"
                autoComplete="username"
                value={email || ''}
                onChange={(e) => {
                  updateEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                onBlur={(e) => setEmailError(emailErrorFor(e.target.value))}
                error={emailError}
              />
              <HudInput
                icon={<FiLock size={14} />}
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
                value={password || ''}
                onChange={(e) => updatePassword(e.target.value)}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="text-gray-600 hover:text-cyan-400 transition"
                  >
                    {showPw ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                }
              />
              <div className="flex items-center justify-between">
                <Check
                  checked={rememberMe}
                  onChange={setRememberMe}
                  label="Keep me logged in"
                />
                <LinkButton onClick={() => switchMode('reset')}>
                  Forgot password?
                </LinkButton>
              </div>
              {regNotice && (
                <p className="text-[11px] font-mono text-emerald-400">
                  {regNotice}
                </p>
              )}
              {fail && error_message && (
                <p className="text-[11px] font-mono text-red-400">
                  {error_message}
                </p>
              )}
              <HudButton
                variant="primary"
                fullWidth
                type="submit"
                disabled={busy}
                glitch={loginFailed}
              >
                {busy ? 'AUTHENTICATING…' : 'SIGN IN'}
              </HudButton>
              <GoogleBlock onSuccess={handleGoogle} />
            </form>
          ) : mode === 'register' ? (
            /* ── REGISTER ── */
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <HudInput
                icon={<FiUser size={14} />}
                type="text"
                placeholder="Full name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
              <HudInput
                icon={<FiMail size={14} />}
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={regEmail}
                onChange={(e) => {
                  setRegEmail(e.target.value);
                  if (regEmailError) setRegEmailError('');
                }}
                onBlur={(e) => setRegEmailError(emailErrorFor(e.target.value))}
                error={regEmailError}
              />
              <HudInput
                icon={<FiLock size={14} />}
                type={showRegPw ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="new-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowRegPw((p) => !p)}
                    className="text-gray-600 hover:text-cyan-400 transition"
                  >
                    {showRegPw ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                }
              />
              <Check
                checked={agreeTerms}
                onChange={setAgreeTerms}
                label="I agree to the Terms & Conditions and Privacy Policy"
              />
              {regError && (
                <p className="text-[11px] font-mono text-red-400">{regError}</p>
              )}
              <HudButton
                variant="primary"
                fullWidth
                type="submit"
                disabled={busy || !agreeTerms}
              >
                {busy ? 'CREATING…' : 'CREATE ACCOUNT'}
              </HudButton>
              <GoogleBlock onSuccess={handleGoogle} />
            </form>
          ) : (
            /* ── RESET ── */
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              {resetSent ? (
                <p className="text-[11px] font-mono text-emerald-400 text-center py-4">
                  If that email exists, a reset link is on its way.
                </p>
              ) : (
                <React.Fragment>
                  <HudText variant="bodySmall" color="muted">
                    Enter your email to receive a password reset link.
                  </HudText>
                  <HudInput
                    icon={<FiMail size={14} />}
                    type="email"
                    placeholder="Email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                  <HudButton
                    variant="primary"
                    fullWidth
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? 'SENDING…' : 'SEND RESET LINK'}
                  </HudButton>
                </React.Fragment>
              )}
              <LinkButton onClick={() => switchMode('login')}>
                ← Back to sign in
              </LinkButton>
            </form>
          )}
        </HudCard>

        <div className="text-center mt-6">
          <HudText variant="tiny" color="faint" className="tracking-wider">
            ■ SECURE CONNECTION ESTABLISHED
          </HudText>
        </div>
      </div>
    </div>
  );
}


function Check({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-left"
    >
      <span
        className={`h-3.5 w-3.5 flex-shrink-0 border flex items-center justify-center transition ${
          checked
            ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-400'
            : 'border-cyan-500/20 bg-black/30 text-transparent'
        }`}
      >
        <span className="text-[9px] leading-none">✓</span>
      </span>
      <span className="text-[9px] font-mono text-gray-500">{label}</span>
    </button>
  );
}

function LinkButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] font-mono text-gray-600 hover:text-cyan-400 transition text-center"
    >
      {children}
    </button>
  );
}

function GoogleBlock({ onSuccess }) {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <HudText variant="tiny" color="dim" className="text-center mt-1">
        Google sign-in: set REACT_APP_GOOGLE_CLIENT_ID
      </HudText>
    );
  }
  return (
    <React.Fragment>
      <div className="flex items-center gap-3 my-1">
        <span className="flex-1 h-px bg-cyan-500/10" />
        <HudText variant="tiny" color="dim">
          OR
        </HudText>
        <span className="flex-1 h-px bg-cyan-500/10" />
      </div>
      {/* Google renders its own iframe button (can't be freely restyled), so we
          clip it into the HUD chamfer with a HudCard frame + overflow-hidden. */}
      <HudCard
        chamfer={8}
        border="cyan"
        surface="bg-[#0a0f1a]"
        bodyClassName="p-0 flex justify-center overflow-hidden [color-scheme:dark]"
      >
        <GoogleLogin
          onSuccess={onSuccess}
          onError={() => {}}
          theme="filled_black"
          shape="rectangular"
          text="continue_with"
          width={340}
        />
      </HudCard>
    </React.Fragment>
  );
}
