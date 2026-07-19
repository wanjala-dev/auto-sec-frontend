import {
  buildCombinedFilterPath,
  buildPriceFilterPath
} from '../../domain/shop/filterCollections';
import { filterApi } from '../../infrastructure/shop/filterApi';

export const filterShopByPrice = async (minprice: any, maxprice: any) => {
  const path = buildPriceFilterPath(minprice, maxprice);
  if (!path) {
    return [];
  }
  const response = await filterApi.getByPath(path);
  return response?.data;
};

export const filterShopByRating = async (rating: any) => {
  const response = await filterApi.getByPath(`/shop/filter/rating/${rating}/`);
  return response?.data;
};

export const filterShopByCondition = async (condition: any) => {
  const response = await filterApi.getByPath(
    `/shop/filter/condition/${condition}/`
  );
  return response?.data;
};

export const filterShopByPriceAndRating = async (
  minprice: any,
  maxprice: any,
  rating: any
) => {
  const response = await filterApi.getByPath(
    `/shop/filter/price_and_rating/${minprice}/${maxprice}/${rating}/`
  );
  return response?.data;
};

export const filterShopByPriceAndCondition = async (
  minprice: any,
  maxprice: any,
  condition: any
) => {
  const response = await filterApi.getByPath(
    `/shop/filter/price_and_condition/${minprice}/${maxprice}/${condition}/`
  );
  return response?.data;
};

export const filterShopByRatingAndCondition = async (
  rating: any,
  condition: any
) => {
  const response = await filterApi.getByPath(
    `/shop/filter/rating_and_condition/${rating}/${condition}/`
  );
  return response?.data;
};

export const filterShopByAll = async (
  minprice: any,
  maxprice: any,
  rating: any,
  condition: any
) => {
  const response = await filterApi.getByPath(
    buildCombinedFilterPath(minprice, maxprice, rating, condition)
  );
  return response?.data;
};
