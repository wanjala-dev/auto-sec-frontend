import { useCallback, useMemo } from 'react';
import {
  filterShopByAll,
  filterShopByCondition,
  filterShopByPrice,
  filterShopByPriceAndCondition,
  filterShopByPriceAndRating,
  filterShopByRating,
  filterShopByRatingAndCondition
} from '../../../application/shop/filterService';

export const useShopFilterPresentation = ({
  dispatch,
  actions
}: {
  dispatch: any;
  actions: any;
}) => {
  const filterPrice = useCallback(
    async (minprice, maxprice) => {
      if (!minprice && !maxprice) {
        dispatch({
          type: actions.FILTER_PRICE,
          payload: []
        });
        return [];
      }

      const products = await filterShopByPrice(minprice, maxprice);
      dispatch({
        type: actions.FILTER_PRICE,
        payload: products
      });
      return products;
    },
    [actions.FILTER_PRICE, dispatch]
  );

  const filterRating = useCallback(
    async (rating) => {
      const products = await filterShopByRating(rating);
      dispatch({
        type: actions.FILTER_RATING,
        payload: products
      });
      return products;
    },
    [actions.FILTER_RATING, dispatch]
  );

  const filterCondition = useCallback(
    async (condition) => {
      const products = await filterShopByCondition(condition);
      dispatch({
        type: actions.FILTER_CONDITION,
        payload: products
      });
      return products;
    },
    [actions.FILTER_CONDITION, dispatch]
  );

  const filterPriceAndRating = useCallback(
    async (minprice, maxprice, rating) => {
      const products = await filterShopByPriceAndRating(
        minprice,
        maxprice,
        rating
      );
      dispatch({
        type: actions.FILTER_PRICE_AND_RATING,
        payload: products
      });
      return products;
    },
    [actions.FILTER_PRICE_AND_RATING, dispatch]
  );

  const filterPriceAndCondition = useCallback(
    async (minprice, maxprice, condition) => {
      const products = await filterShopByPriceAndCondition(
        minprice,
        maxprice,
        condition
      );
      dispatch({
        type: actions.FILTER_PRICE_AND_CONDITION,
        payload: products
      });
      return products;
    },
    [actions.FILTER_PRICE_AND_CONDITION, dispatch]
  );

  const filterRatingAndCondition = useCallback(
    async (rating, condition) => {
      const products = await filterShopByRatingAndCondition(rating, condition);
      dispatch({
        type: actions.FILTER_RATING_AND_CONDITION,
        payload: products
      });
      return products;
    },
    [actions.FILTER_RATING_AND_CONDITION, dispatch]
  );

  const filterAll = useCallback(
    async (minprice, maxprice, rating, condition) => {
      const products = await filterShopByAll(
        minprice,
        maxprice,
        rating,
        condition
      );
      dispatch({
        type: actions.FILTER_ALL,
        payload: products
      });
      return products;
    },
    [actions.FILTER_ALL, dispatch]
  );

  const resetFilter = useCallback(() => {
    dispatch({
      type: actions.RESET_FILTER,
      payload: []
    });
  }, [actions.RESET_FILTER, dispatch]);

  return useMemo(
    () => ({
      filterPrice,
      filterRating,
      filterCondition,
      filterPriceAndRating,
      filterPriceAndCondition,
      filterRatingAndCondition,
      filterAll,
      resetFilter
    }),
    [
      filterPrice,
      filterRating,
      filterCondition,
      filterPriceAndRating,
      filterPriceAndCondition,
      filterRatingAndCondition,
      filterAll,
      resetFilter
    ]
  );
};
