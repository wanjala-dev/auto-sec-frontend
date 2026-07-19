import apiClient from '../http/apiClient';

export const authFlowApi = {
  login: (url: string, payload: Record<string, unknown>) =>
    apiClient.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*'
      }
    }),

  // Exchange a Google ID token (the GIS `credential`) for a platform JWT
  // session. Same response shape as `login` so the session plumbing is
  // shared. `?response=minimal` mirrors the email-login call.
  loginGoogle: (payload: Record<string, unknown>) =>
    apiClient.post('/identity/google/?response=minimal', payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*'
      }
    }),

  requestPasswordReset: (payload: Record<string, unknown>) =>
    apiClient.post('/identity/request-reset-email/', payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }),

  completePasswordReset: (payload: Record<string, unknown>) =>
    apiClient.patch('/identity/password-reset-complete', payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }),

  refreshToken: (payload: Record<string, unknown>) =>
    apiClient.post('/identity/token/refresh/', payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*'
      }
    }),

  verifyEmail: (token: string) =>
    apiClient.get('/identity/email-verify/', {
      params: { token }
    }),

  verifyOtp: (
    method: 'totp' | 'recovery',
    payload: Record<string, unknown>,
    preauthToken: string
  ) =>
    apiClient.post(
      method === 'recovery'
        ? '/identity/otp/static/verify/'
        : '/identity/otp/verify/',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
          Authorization: `Bearer ${preauthToken}`
        }
      }
    ),

  logout: (url: string, payload: Record<string, unknown>) =>
    apiClient.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*'
      },
      // Logout must never trap the UI on a slow/hung backend.
      timeout: 5000
    })
};
