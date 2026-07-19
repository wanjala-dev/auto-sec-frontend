import { LOGIN_URL, LOGOUT_URL } from '../../../constants/urls';
import { useLoginAuthRecoveryPresentation } from './useLoginAuthRecoveryPresentation';
import { useLoginAuthSessionPresentation } from './useLoginAuthSessionPresentation';

export const useLoginAuthPresentationSlices = ({
  state,
  notifySummaryUpdated,
  support
}: {
  state: any;
  notifySummaryUpdated: any;
  support: any;
}) => {
  const session = useLoginAuthSessionPresentation({
    state,
    setLoading: support.setLoading,
    resetAuthForm: support.resetAuthForm,
    notifySummaryUpdated,
    loginUrl: LOGIN_URL,
    logoutUrl: LOGOUT_URL
  });

  const recovery = useLoginAuthRecoveryPresentation({
    setLoading: support.setLoading,
    resetAuthForm: support.resetAuthForm,
    showError: support.showError
  });

  return {
    session,
    recovery
  };
};
