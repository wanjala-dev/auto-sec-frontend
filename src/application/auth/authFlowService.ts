import { authFlowApi } from '../../infrastructure/auth/authFlowApi';

export const loginWithCredentials = async ({
  url,
  email,
  password
}: {
  url: string;
  email: string;
  password: string;
}) => {
  const response = await authFlowApi.login(url, {
    email,
    password
  });

  return response?.data ?? {};
};

export const loginWithGoogleCredential = async (credential: string) => {
  const response = await authFlowApi.loginGoogle({ auth_token: credential });
  return response?.data ?? {};
};

export const requestPasswordResetEmail = async (
  email: string,
  redirectUrl: string
) => {
  const response = await authFlowApi.requestPasswordReset({
    email,
    redirect_url: redirectUrl
  });

  return response?.data ?? {};
};

export const completePasswordResetRequest = async ({
  password,
  token,
  uidb64
}: {
  password: string;
  token: string;
  uidb64: string;
}) => {
  const response = await authFlowApi.completePasswordReset({
    password,
    token,
    uidb64
  });

  return response?.data ?? {};
};

export const logoutWithRefreshToken = async (
  url: string,
  refreshToken: string
) => authFlowApi.logout(url, { refresh: refreshToken });

export const refreshAuthAccessToken = async (refreshToken: string) => {
  const response = await authFlowApi.refreshToken({ refresh: refreshToken });
  return response?.data ?? {};
};

export const verifyEmailToken = async (token: string) => {
  const response = await authFlowApi.verifyEmail(token);
  return response?.data ?? {};
};

export const verifyOtpChallenge = async ({
  token,
  method = 'totp',
  preauthToken
}: {
  token: string;
  method?: 'totp' | 'recovery';
  preauthToken: string;
}) => {
  const response = await authFlowApi.verifyOtp(method, { token }, preauthToken);
  return response?.data ?? {};
};
