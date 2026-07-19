import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import CommandCenterV2Page from '../../features/agents/presentation/pages/CommandCenterV2Page';
import AutoSecLoginPage from '../../features/auth/presentation/pages/AutoSecLoginPage';
import ResetPasswordConfirmPage from '../../features/auth/presentation/pages/ResetPasswordConfirmPage';
import ResetPasswordSuccessPage from '../../features/auth/presentation/pages/ResetPasswordSuccessPage';
import EmailConfirmPage from '../../features/auth/presentation/pages/EmailConfirmPage';

/**
 * Auth gate — the HUD command center is protected. Without a JWT in storage we
 * bounce to /identity/login (the same path apiClient redirects to on session
 * death), so data endpoints never render behind a 401'd shell.
 */
function RequireAuth({ children }) {
  const hasToken =
    typeof window !== 'undefined' && !!localStorage.getItem('token');
  if (!hasToken) {
    return <Navigate to="/identity/login" replace />;
  }
  return children;
}

const guardedHud = (
  <RequireAuth>
    <CommandCenterV2Page />
  </RequireAuth>
);

/**
 * Root application shell. Single-screen HUD (single-screen-hud rule): the ONLY
 * routes are the full-page HUD (`/`) behind an auth gate and the pre-auth
 * screens (login + password-reset + email-confirm). The onboarding gate is a
 * blocking MODAL rendered inside the HUD, not a route.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/identity/login" element={<AutoSecLoginPage />} />
      <Route
        path="/identity/password-reset-confirm/:uidb64/:token"
        element={<ResetPasswordConfirmPage />}
      />
      <Route
        path="/identity/reset-password-success"
        element={<ResetPasswordSuccessPage />}
      />
      <Route path="/identity/email-confirmed" element={<EmailConfirmPage />} />
      <Route path="/" element={guardedHud} />
      <Route path="/ai/v2" element={guardedHud} />
      <Route path="/ai/v2/:seed" element={guardedHud} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
