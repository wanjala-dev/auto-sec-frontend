import {
  extractCartItems,
  extractFirstCartItem,
  normalizeCartQuantity,
  resolveStoredUserId
} from '../../domain/shop/cartCollections';
import { cartApi } from '../../infrastructure/shop/cartApi';

// Deduplicate concurrent getCart calls for the same user.
// Prevents infinite-loop re-renders from hammering the endpoint.
let _pendingGetCart: { key: string; promise: Promise<any> } | null = null;

export const getUserCart = async (userId: string | number) => {
  const key = String(userId);
  if (_pendingGetCart && _pendingGetCart.key === key) {
    return _pendingGetCart.promise;
  }
  const promise = cartApi
    .getCart(userId)
    .then((response) => response?.data)
    .finally(() => {
      if (_pendingGetCart?.key === key) _pendingGetCart = null;
    });
  _pendingGetCart = { key, promise };
  return promise;
};

let _pendingIncrement: { key: string; promise: Promise<any> } | null = null;

export const incrementUserCart = async (
  userId: string | number,
  quantity: any
) => {
  const key = `inc-${userId}`;
  if (_pendingIncrement && _pendingIncrement.key === key) {
    return _pendingIncrement.promise;
  }
  const promise = cartApi
    .updateCart(userId, {
      userId,
      quantity: normalizeCartQuantity(quantity, 1)
    })
    .then((r) => r?.data)
    .finally(() => {
      if (_pendingIncrement?.key === key) _pendingIncrement = null;
    });
  _pendingIncrement = { key, promise };
  return promise;
};

export const decrementUserCart = async (
  userId: string | number,
  quantity: any
) => {
  const response = await cartApi.updateCart(userId, {
    userId,
    quantity: normalizeCartQuantity(quantity, -1)
  });
  return response?.data;
};

export const getCartItemCollection = async (cartId: string | number) => {
  const response = await cartApi.getCartItems(cartId);
  return extractCartItems(response?.data);
};

export const addProductToCart = async (
  cartId: string | number,
  productId: string | number
) => {
  // When there's no cart yet, cartId is missing/'undefined' and the detect
  // lookup can fail — treat that as "no existing item" and fall through to
  // create the cart with this product (the backend creates a cart from
  // userId + productId). Never let a failed detect block the add.
  let existingItem: any;
  try {
    const detected = await cartApi.detectExistingCartItem(cartId, productId);
    existingItem = extractFirstCartItem(detected?.data);
  } catch {
    existingItem = null;
  }

  if (!existingItem || cartId === 'undefined' || !cartId) {
    const userId = resolveStoredUserId();
    const response = await cartApi.addCartItem({
      cartId,
      productId,
      quantity: 1,
      userId
    });
    return response?.data?.data || response?.data;
  }

  const nextQuantity = normalizeCartQuantity(existingItem?.quantity, 1);
  await cartApi.updateCartItem(existingItem?.id, {
    cartId,
    productId,
    quantity: nextQuantity
  });
  return { id: existingItem?.id, quantity: nextQuantity };
};

export const removeCartItem = (cartItemId: string | number) =>
  cartApi.deleteCartItem(cartItemId);
