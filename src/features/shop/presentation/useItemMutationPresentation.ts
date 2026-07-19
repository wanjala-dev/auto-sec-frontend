import { useCallback, useMemo } from 'react';
import {
  createShopItem,
  deleteShopItem,
  updateShopItem
} from '../../../application/shop/itemService';

export const useItemMutationPresentation = ({
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
  const addItem = useCallback(
    async (item, file) => {
      setLoading(true);
      try {
        const createdItem = await createShopItem(item, file);
        dispatch({
          type: actions.ADD_ITEM,
          payload: createdItem
        });
        return createdItem;
      } catch (error) {
        setError(error);
        return null;
      }
    },
    [actions.ADD_ITEM, dispatch, setError, setLoading]
  );

  const deleteItem = useCallback(
    async (id, filename) => {
      setLoading(true);
      try {
        const deletedItem = await deleteShopItem(id, filename);
        dispatch({
          type: actions.DELETE_ITEM,
          payload: deletedItem
        });
        return deletedItem;
      } catch (error) {
        setError(error);
        return null;
      }
    },
    [actions.DELETE_ITEM, dispatch, setError, setLoading]
  );

  const updateItem = useCallback(
    async (id, item, file) => {
      setLoading(true);
      try {
        const updatedItem = await updateShopItem(id, item, file);
        dispatch({
          type: actions.UPDATE_ITEM,
          payload: updatedItem
        });
        return updatedItem;
      } catch (error) {
        setError(error);
        return null;
      }
    },
    [actions.UPDATE_ITEM, dispatch, setError, setLoading]
  );

  const emptyItem = useCallback(() => {
    dispatch({
      type: actions.EMPTY_ITEMS
    });
  }, [actions.EMPTY_ITEMS, dispatch]);

  return useMemo(
    () => ({ addItem, deleteItem, updateItem, emptyItem }),
    [addItem, deleteItem, updateItem, emptyItem]
  );
};
