import apiClient from '../http/apiClient';

const withJsonHeaders = {
  headers: {
    'Content-Type': 'application/json',
    Accept: '*/*'
  }
};

export const cartApi = {
  getCart(userId: string | number) {
    return apiClient.get(`/cart/${userId}/`, withJsonHeaders);
  },
  updateCart(userId: string | number, payload: Record<string, unknown>) {
    return apiClient.put(`/cart/${userId}/`, payload, withJsonHeaders);
  },
  getCartItems(cartId: string | number) {
    return apiClient.get(`/cart/items/${cartId}/`, withJsonHeaders);
  },
  detectExistingCartItem(cartId: string | number, productId: string | number) {
    return apiClient.get(
      `/cart/cartItemDetectSameItem/${cartId}/${productId}/`,
      withJsonHeaders
    );
  },
  addCartItem(payload: Record<string, unknown>) {
    return apiClient.post('/cart/add/', payload, withJsonHeaders);
  },
  updateCartItem(
    cartItemId: string | number,
    payload: Record<string, unknown>
  ) {
    return apiClient.put(`/cart/id/${cartItemId}/`, payload, withJsonHeaders);
  },
  deleteCartItem(cartItemId: string | number) {
    return apiClient.delete(`/cart/id/${cartItemId}/`, withJsonHeaders);
  }
};
