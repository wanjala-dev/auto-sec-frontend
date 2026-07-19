import {
  GET_CART,
  ADD_TO_CART,
  DELETE_FROM_CART,
  CART_LOADING,
  GET_ITEMS_CART,
  ADD_ITEM_TO_CART,
  DELETE_ITEM_FROM_CART,
  CART_ITEM_LOADING,
  SET_ERROR
} from '../types/cartTypes';

// Reducer function
const cartReducer = (state, action) => {
  // Destructure action for clarity
  const { type, payload } = action;

  // Use block scope for each case
  switch (type) {
    case GET_CART: {
      return {
        ...state,
        cart: payload ?? state.cart,
        loadingCart: false,
        error: false,
        message: ''
      };
    }

    case ADD_TO_CART: {
      return {
        ...state,
        cart: payload ?? state.cart,
        loadingCart: false,
        error: false,
        message: ''
      };
    }

    case DELETE_FROM_CART: {
      return {
        ...state,
        cart: payload ?? state.cart,
        loadingCart: false,
        error: false,
        message: ''
      };
    }

    case CART_LOADING: {
      return {
        ...state,
        loadingCart: true,
        error: false
      };
    }

    case GET_ITEMS_CART: {
      // Provide default values for safety
      return {
        ...state,
        cartItem: payload ?? [],
        loadingCartItem: false,
        error: false,
        message: ''
      };
    }

    case ADD_ITEM_TO_CART: {
      return {
        ...state,
        loadingCartItem: false,
        error: false,
        message: ''
      };
    }

    case DELETE_ITEM_FROM_CART: {
      return {
        ...state,
        loadingCartItem: false,
        error: false,
        message: ''
      };
    }

    case CART_ITEM_LOADING: {
      // Use nullish coalescing for defaults
      return {
        ...state,
        loadingCartItem: payload ?? true
      };
    }

    case SET_ERROR: {
      return {
        ...state,
        loadingCart: false,
        loadingCartItem: false,
        error: payload?.error ?? true,
        message: payload?.message || ''
      };
    }

    // Default case returns state unchanged
    default:
      return state;
  }
};

export default cartReducer;
