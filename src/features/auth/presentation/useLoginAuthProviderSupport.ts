import { useCallback } from 'react';
import {
  CLEAR_ERROR,
  LOAD,
  RESET_AUTH_FORM,
  SHOW_ERROR,
  TOGGLE_PASSWORD_VISIBILITY,
  UPDATE_EMAIL,
  UPDATE_PASSWORD,
  UPDATE_USERNAME
} from '../../../constants/actions';

export const SUCCESS_ERROR = false;
export const FAIL_ERROR = true;

export const useLoginAuthProviderSupport = ({
  dispatch
}: {
  dispatch: any;
}) => {
  const setLoading = useCallback(
    (status, description) => {
      dispatch({ type: LOAD, payload: { status, description } });
    },
    [dispatch]
  );

  const updateUserName = useCallback(
    (username) => {
      dispatch({ type: UPDATE_USERNAME, payload: username });
    },
    [dispatch]
  );

  const updateEmail = useCallback(
    (email) => {
      dispatch({ type: UPDATE_EMAIL, payload: email });
    },
    [dispatch]
  );

  const updatePassword = useCallback(
    (password) => {
      dispatch({ type: UPDATE_PASSWORD, payload: password });
    },
    [dispatch]
  );

  const hideError = useCallback(() => {
    setTimeout(() => {
      dispatch({ type: CLEAR_ERROR });
    }, 5000);
  }, [dispatch]);

  const showError = useCallback(
    (msg, fail) => {
      dispatch({ type: SHOW_ERROR, payload: { msg, fail } });
      hideError();
    },
    [dispatch, hideError]
  );

  const togglePasswordVisibility = useCallback(() => {
    dispatch({ type: TOGGLE_PASSWORD_VISIBILITY });
  }, [dispatch]);

  const resetAuthForm = useCallback(() => {
    dispatch({ type: RESET_AUTH_FORM });
  }, [dispatch]);

  return {
    setLoading,
    updateUserName,
    updateEmail,
    updatePassword,
    showError,
    togglePasswordVisibility,
    resetAuthForm
  };
};
