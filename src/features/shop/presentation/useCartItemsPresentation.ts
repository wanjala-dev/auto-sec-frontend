import { useCallback, useMemo } from 'react';
import {
  addProductToCart,
  getCartItemCollection,
  removeCartItem
} from '../../../application/shop/cartService';
import { normalizeCartErrorMessage } from '../../../domain/shop/cartCollections';

export const useCartItemsPresentation = ({
  dispatch,
  actions,
  addToast,
  setLoading
}: {
  dispatch: any;
  actions: any;
  addToast: (payload: { message: string }) => void;
  setLoading: (status: boolean) => void;
}) => {
  const getItemsCart = useCallback(
    async (cartId) => {
      setLoading(true);
      try {
        const items = await getCartItemCollection(cartId);
        dispatch({
          type: actions.GET_ITEMS_CART,
          payload: items
        });
        return items;
      } catch (error) {
        const message = normalizeCartErrorMessage(
          error,
          'Unknown Error - check your network connection'
        );
        addToast({ message });
        dispatch({
          type: actions.SET_ERROR,
          payload: {
            error: true,
            message
          }
        });
        return [];
      }
    },
    [actions.GET_ITEMS_CART, actions.SET_ERROR, addToast, dispatch, setLoading]
  );

  const addItemToCart = useCallback(
    async (cartId, productId) => {
      try {
        const payload = await addProductToCart(cartId, productId);
        dispatch({
          type: actions.ADD_ITEM_TO_CART,
          payload
        });
        if (cartId) {
          await getItemsCart(cartId);
        }
        return payload;
      } catch (error) {
        const message = normalizeCartErrorMessage(
          error,
          'Unable to add item to cart'
        );
        addToast({ message });
        dispatch({
          type: actions.SET_ERROR,
          payload: {
            error: true,
            message
          }
        });
        return null;
      }
    },
    [
      actions.ADD_ITEM_TO_CART,
      actions.SET_ERROR,
      addToast,
      dispatch,
      getItemsCart
    ]
  );

  const deleteItemFromCart = useCallback(
    async (id) => {
      try {
        await removeCartItem(id);
        dispatch({
          type: actions.DELETE_ITEM_FROM_CART
        });
        // No route change here — the caller removes the row optimistically and
        // stays on the page. (Previously this pushed '/shop/' to force a
        // refresh, which yanked the user off the cart on every delete.)
        return true;
      } catch (error) {
        const message = normalizeCartErrorMessage(
          error,
          'Unable to delete cart item'
        );
        addToast({ message });
        dispatch({
          type: actions.SET_ERROR,
          payload: {
            error: true,
            message
          }
        });
        return false;
      }
    },
    [actions.DELETE_ITEM_FROM_CART, actions.SET_ERROR, addToast, dispatch]
  );

  return useMemo(
    () => ({ getItemsCart, addItemToCart, deleteItemFromCart }),
    [getItemsCart, addItemToCart, deleteItemFromCart]
  );
};
