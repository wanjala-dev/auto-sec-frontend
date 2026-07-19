import { useCallback, useMemo, useRef } from 'react';
import {
  decrementUserCart,
  getUserCart,
  incrementUserCart
} from '../../../application/shop/cartService';
import { normalizeCartErrorMessage } from '../../../domain/shop/cartCollections';

export const useCartSummaryPresentation = ({
  dispatch,
  actions,
  addToast
}: {
  dispatch: any;
  actions: any;
  addToast: (payload: { message: string }) => void;
}) => {
  // Guard: prevent getCart from firing while a request is already in flight.
  const cartFetchingRef = useRef(false);

  const getCart = useCallback(
    async (id) => {
      if (cartFetchingRef.current) return null;
      cartFetchingRef.current = true;
      dispatch({ type: actions.CART_LOADING });
      try {
        const cart = await getUserCart(id);
        dispatch({
          type: actions.GET_CART,
          payload: cart
        });
        return cart;
      } catch (error) {
        dispatch({
          type: actions.SET_ERROR,
          payload: {
            error: true,
            message: normalizeCartErrorMessage(error, 'Unknown error')
          }
        });
        return null;
      } finally {
        cartFetchingRef.current = false;
      }
    },
    [actions.CART_LOADING, actions.GET_CART, actions.SET_ERROR, dispatch]
  );

  const addToCart = useCallback(
    async (id, quantity) => {
      dispatch({ type: actions.CART_LOADING });
      try {
        const cart = await incrementUserCart(id, quantity);
        dispatch({
          type: actions.ADD_TO_CART,
          payload: cart
        });
        return cart;
      } catch (error) {
        dispatch({
          type: actions.SET_ERROR,
          payload: {
            error: true,
            message: normalizeCartErrorMessage(error, 'Unable to update cart')
          }
        });
        addToast({
          message: normalizeCartErrorMessage(error, 'Unable to update cart')
        });
        return null;
      }
    },
    [
      actions.ADD_TO_CART,
      actions.CART_LOADING,
      actions.SET_ERROR,
      addToast,
      dispatch
    ]
  );

  const deleteFromCart = useCallback(
    async (id, quantity) => {
      dispatch({ type: actions.CART_LOADING });
      try {
        const cart = await decrementUserCart(id, quantity);
        dispatch({
          type: actions.DELETE_FROM_CART,
          payload: cart
        });
        return cart;
      } catch (error) {
        const message = normalizeCartErrorMessage(
          error,
          'Unable to update cart'
        );
        dispatch({
          type: actions.SET_ERROR,
          payload: {
            error: true,
            message
          }
        });
        addToast({ message });
        return null;
      }
    },
    [
      actions.CART_LOADING,
      actions.DELETE_FROM_CART,
      actions.SET_ERROR,
      addToast,
      dispatch
    ]
  );

  return useMemo(
    () => ({ getCart, addToCart, deleteFromCart }),
    [getCart, addToCart, deleteFromCart]
  );
};
