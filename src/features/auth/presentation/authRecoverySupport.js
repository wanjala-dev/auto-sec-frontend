import {
  completePasswordResetRequest,
  requestPasswordResetEmail
} from '../../../application/auth/authFlowService';
import {
  readBrowserOrigin,
  replaceBrowserRoute
} from '../../../features/navigation/presentation/browserNavigationSupport';

export const resolveSafeBrowserRedirectUrl = (redirectUrl) => {
  if (!redirectUrl) return null;

  try {
    const origin = readBrowserOrigin();
    if (!origin) return null;

    const resolved = new URL(redirectUrl, origin);
    if (resolved.origin !== origin) {
      return null;
    }

    return resolved.toString();
  } catch (_) {
    return null;
  }
};

export const requestPasswordResetRecovery = (email, redirectUrl) =>
  requestPasswordResetEmail(email, redirectUrl);

export const completePasswordResetRecovery = ({ password, token, uidb64 }) =>
  completePasswordResetRequest({
    password,
    token,
    uidb64
  });

export const redirectAfterRecovery = (nextLocation) => {
  replaceBrowserRoute(nextLocation);
};
