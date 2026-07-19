import { useCallback, useMemo } from 'react';
import {
  getShopItemById,
  listShopItems,
  listShopItemsByCategory,
  listShopProductImages,
  searchShopItems
} from '../../../application/shop/itemService';

export const useItemCatalogPresentation = ({
  dispatch,
  actions,
  setLoading,
  setError
}: {
  dispatch: any;
  actions: any;
  setLoading: (status: boolean) => void;
  setError: (error: any) => void;
}) => {
  const getItems = useCallback(
    async (url) => {
      setLoading(true);
      try {
        const items = await listShopItems(url);
        dispatch({
          type: actions.GET_ITEMS,
          payload: items
        });
        return items;
      } catch (error) {
        setError(error);
        return [];
      }
    },
    [actions.GET_ITEMS, dispatch, setError, setLoading]
  );

  const searchItems = useCallback(
    async (keyword) => {
      setLoading(true);
      try {
        const items = await searchShopItems(keyword);
        dispatch({
          type: actions.SEARCH_ITEMS,
          payload: items
        });
        return items;
      } catch (error) {
        setError(error);
        return [];
      }
    },
    [actions.SEARCH_ITEMS, dispatch, setError, setLoading]
  );

  const getItemById = useCallback(
    async (url, id) => {
      setLoading(true);
      try {
        const item = await getShopItemById(url, id);
        dispatch({
          type: actions.GET_ITEMS_BY_ID,
          payload: item
        });
        return item;
      } catch (error) {
        setError(error);
        return null;
      }
    },
    [actions.GET_ITEMS_BY_ID, dispatch, setError, setLoading]
  );

  const getProductImages = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const images = await listShopProductImages(id);
        dispatch({
          type: actions.GET_PRODUCT_IMAGES,
          payload: images
        });
        return images;
      } catch (error) {
        setError(error);
        return [];
      }
    },
    [actions.GET_PRODUCT_IMAGES, dispatch, setError, setLoading]
  );

  const getItemByCategory = useCallback(
    async (category) => {
      setLoading(true);
      try {
        const items = await listShopItemsByCategory(category);
        dispatch({
          type: actions.GET_ITEM_BY_CATEGORY,
          payload: items
        });
        return items;
      } catch (error) {
        setError(error);
        return [];
      }
    },
    [actions.GET_ITEM_BY_CATEGORY, dispatch, setError, setLoading]
  );

  return useMemo(
    () => ({
      getItems,
      searchItems,
      getItemById,
      getProductImages,
      getItemByCategory
    }),
    [getItems, searchItems, getItemById, getProductImages, getItemByCategory]
  );
};
