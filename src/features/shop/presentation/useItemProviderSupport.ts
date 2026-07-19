import { useCallback } from 'react';
import { SET_ERROR, SET_LOADING } from '../../../types/itemTypes';

export const useItemProviderSupport = ({ dispatch }) => {
  const setLoading = useCallback(
    (status) => dispatch({ type: SET_LOADING, payload: status }),
    [dispatch]
  );

  const setError = useCallback(
    (error) =>
      dispatch({
        type: SET_ERROR,
        payload: { error: error?.status ?? true, message: error?.message || '' }
      }),
    [dispatch]
  );

  return {
    setLoading,
    setError
  };
};
