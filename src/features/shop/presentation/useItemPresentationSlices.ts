import { useMemo } from 'react';
import { useItemCatalogPresentation } from './useItemCatalogPresentation';
import { useItemMutationPresentation } from './useItemMutationPresentation';

export const useItemPresentationSlices = ({ dispatch, actions, support }) => {
  const catalog = useItemCatalogPresentation({
    dispatch,
    actions,
    setLoading: support.setLoading,
    setError: support.setError
  });

  const mutation = useItemMutationPresentation({
    dispatch,
    actions,
    setLoading: support.setLoading,
    setError: support.setError
  });

  return useMemo(() => ({ catalog, mutation }), [catalog, mutation]);
};
