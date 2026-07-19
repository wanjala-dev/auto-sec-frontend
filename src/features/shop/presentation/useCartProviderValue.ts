import { useMemo } from 'react';
import { FAIL_ERROR, SUCCESS_ERROR } from './cartContextConfig';

export const useCartProviderValue = ({ state, summary, items, support }) =>
  useMemo(
    () => ({
      ...state,
      getCart: summary.getCart,
      addToCart: summary.addToCart,
      deleteFromCart: summary.deleteFromCart,
      getItemsCart: items.getItemsCart,
      addItemToCart: items.addItemToCart,
      deleteItemFromCart: items.deleteItemFromCart,
      setLoading: support.setLoading,
      SUCCESS_ERROR,
      FAIL_ERROR
    }),
    [state, summary, items, support]
  );
