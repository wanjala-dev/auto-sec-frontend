import { useMemo } from 'react';

export const useFilterProviderValue = ({ state, filterPresentation }) =>
  useMemo(
    () => ({
      ...state,
      filterPrice: filterPresentation.filterPrice,
      filterRating: filterPresentation.filterRating,
      filterCondition: filterPresentation.filterCondition,
      filterPriceAndRating: filterPresentation.filterPriceAndRating,
      filterPriceAndCondition: filterPresentation.filterPriceAndCondition,
      filterRatingAndCondition: filterPresentation.filterRatingAndCondition,
      filterAll: filterPresentation.filterAll,
      resetFilter: filterPresentation.resetFilter
    }),
    [state, filterPresentation]
  );
