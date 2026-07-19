import { useMemo } from 'react';
import { FAIL_ERROR, SUCCESS_ERROR } from './useLoginAuthProviderSupport';

export const useLoginAuthProviderValue = ({
  state,
  support,
  session,
  recovery
}: {
  state: any;
  support: any;
  session: any;
  recovery: any;
}) =>
  useMemo(
    () => ({
      ...state,
      setLoading: support.setLoading,
      updateUserName: support.updateUserName,
      updatePassword: support.updatePassword,
      updateEmail: support.updateEmail,
      show_error: support.showError,
      toggle_password_visibility: support.togglePasswordVisibility,
      reset_auth_form: support.resetAuthForm,
      login: session.login,
      verifyOtpLogin: session.verifyOtpLogin,
      clearOtpLogin: session.clearOtpLogin,
      logout: session.logout,
      SUCCESS_ERROR,
      FAIL_ERROR,
      login_google: session.loginWithGoogle,
      reset: recovery.reset,
      createNewPassword: recovery.createNewPassword
    }),
    [state, support, session, recovery]
  );
