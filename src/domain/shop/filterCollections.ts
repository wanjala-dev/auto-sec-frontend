export const buildPriceFilterPath = (minprice: any, maxprice: any) => {
  if (minprice && maxprice) {
    return `/shop/filter/price/${minprice}/${maxprice}/`;
  }
  if (minprice) {
    return `/shop/filter/price/min/${minprice}/`;
  }
  if (maxprice) {
    return `/shop/filter/price/max/${maxprice}/`;
  }
  return null;
};

export const buildCombinedFilterPath = (
  minprice: any,
  maxprice: any,
  rating: any,
  condition: any
) => `/shop/filter/${minprice}/${maxprice}/${rating}/${condition}/`;
