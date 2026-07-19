import { useMemo } from 'react';
import { useCartItemsPresentation } from './useCartItemsPresentation';
import { useCartSummaryPresentation } from './useCartSummaryPresentation';

export const useCartPresentationSlices = ({ dispatch, actions, support }) => {
  const summary = useCartSummaryPresentation({
    dispatch,
    actions,
    addToast: support.addToast
  });

  const items = useCartItemsPresentation({
    dispatch,
    actions,
    addToast: support.addToast,
    setLoading: support.setLoading
  });

  return useMemo(() => ({ summary, items }), [summary, items]);
};
