import { useCallback } from 'react';
import {
  completePasswordResetRecovery,
  redirectAfterRecovery,
  requestPasswordResetRecovery
} from './authRecoverySupport';

export const useLoginAuthRecoveryPresentation = ({
  setLoading,
  resetAuthForm,
  showError
}: {
  setLoading: (status: boolean, description: string) => void;
  resetAuthForm: () => void;
  showError: (message: string, fail: boolean) => void;
}) => {
  const reset = useCallback(
    async (email) => {
      setLoading(true, 'Reseting...');
      // No redirect_url: after a reset the user always lands on the
      // dedicated success page (see createNewPassword). Sending the reset
      // page path here only produced a junk ?redirect_url that 404'd.
      await requestPasswordResetRecovery(email, '')
        .then((response) => {
          setLoading(false, '');
          const msg = (response[Object.keys(response)[0]] + '').split('.')[0];
          showError(msg, false);
          const rout = `/identity/reset-confirm/${email}`;
          redirectAfterRecovery(rout);
        })
        .catch((error) => {
          setLoading(false, '');
          if (error.response === undefined) {
            showError('Network Error', true);
          } else {
            const err = (
              error.response.data[Object.keys(error.response.data)[0]] + ''
            ).split('.')[0];
            showError(err, true);
          }
          return;
        });
    },
    [setLoading, showError]
  );

  const createNewPassword = useCallback(
    async (event, uidb64, token, redirectUrl) => {
      setLoading(true, 'Updating...');
      await completePasswordResetRecovery({
        password: event,
        token,
        uidb64
      })
        .then((response) => {
          setLoading(false, '');
          resetAuthForm();
          // Always land on the success page. Older reset emails carry a
          // ?redirect_url pointing at the (param-less) reset page, which
          // 404s — never honor it as a post-reset destination.
          redirectAfterRecovery('/identity/reset-password-success');

          const msg = (response[Object.keys(response)[0]] + '').split('.')[0];
          showError(msg, false);
        })
        .catch((error) => {
          setLoading(false, '');
          if (error.response === undefined) {
            showError('Network Error', true);
          } else {
            const err = (
              error.response.data[Object.keys(error.response.data)[0]] + ''
            ).split('.')[0];
            showError(err, true);
            redirectAfterRecovery('/identity/registration-error');
          }
          return;
        });
    },
    [resetAuthForm, setLoading, showError]
  );

  return {
    reset,
    createNewPassword
  };
};
