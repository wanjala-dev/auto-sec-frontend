import { useCallback } from 'react';
import { CART_ITEM_LOADING } from '../../../types/cartTypes';
import { useErrorToast } from '../../../hooks/UseErrorToastHook';

export const useCartProviderSupport = ({ dispatch }) => {
  const { addToast } = useErrorToast(4000);

  const setLoading = useCallback(
    (status) => {
      dispatch({
        type: CART_ITEM_LOADING,
        payload: status
      });
    },
    [dispatch]
  );

  return {
    addToast,
    setLoading
  };
};
