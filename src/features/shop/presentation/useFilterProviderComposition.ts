import { filterActions } from './filterContextConfig';
import { useFilterProviderValue } from './useFilterProviderValue';
import { useShopFilterPresentation } from './useShopFilterPresentation';

export const useFilterProviderComposition = ({ state, dispatch }) => {
  const filterPresentation = useShopFilterPresentation({
    dispatch,
    actions: filterActions
  });

  return useFilterProviderValue({
    state,
    filterPresentation
  });
};
