import {
  ADD_ITEM_TO_CART,
  ADD_TO_CART,
  CART_LOADING,
  DELETE_FROM_CART,
  DELETE_ITEM_FROM_CART,
  GET_CART,
  GET_ITEMS_CART,
  SET_ERROR
} from '../../../types/cartTypes';

export const cartInitialState = {
  items: [],
  cart: [],
  cartItem: [],
  loadingCartItem: false,
  loadingCart: false,
  error: false,
  message: ''
};

export const SUCCESS_ERROR = false;
export const FAIL_ERROR = true;

export const CART_ACTIONS = {
  GET_CART,
  ADD_TO_CART,
  DELETE_FROM_CART,
  CART_LOADING,
  GET_ITEMS_CART,
  ADD_ITEM_TO_CART,
  DELETE_ITEM_FROM_CART,
  SET_ERROR
};
