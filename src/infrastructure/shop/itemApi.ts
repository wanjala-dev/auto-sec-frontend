import apiClient from '../http/apiClient';
import { normalizeShopPath } from '../../domain/shop/itemCollections';

const withJsonHeaders = {
  headers: {
    'Content-Type': 'application/json',
    Accept: '*/*'
  }
};

const withMultipartHeaders = {
  headers: {
    'Content-Type': 'multipart/form-data',
    Accept: '*/*'
  }
};

export const itemApi = {
  list(path: string) {
    return apiClient.get(normalizeShopPath(path), withJsonHeaders);
  },
  search(keyword: string) {
    return apiClient.get('/shop/find/', {
      ...withJsonHeaders,
      params: {
        search: keyword
      }
    });
  },
  getById(path: string, id: string | number) {
    return apiClient.get(`${normalizeShopPath(path)}${id}/`, withJsonHeaders);
  },
  listProductImages(id: string | number) {
    return apiClient.get(`/shop/productImg/${id}/`, withJsonHeaders);
  },
  createProductImage(payload: Record<string, unknown>) {
    return apiClient.post('/shop/productImg/', payload, withJsonHeaders);
  },
  deleteProductImage(id: string | number) {
    return apiClient.delete(`/shop/productImg/id/${id}/`, withJsonHeaders);
  },
  listByCategory(category: string) {
    return apiClient.get(`/shop/find/${category}/`, withJsonHeaders);
  },
  create(payload: Record<string, unknown>) {
    return apiClient.post('/shop/', payload, withJsonHeaders);
  },
  update(id: string | number, payload: Record<string, unknown>) {
    return apiClient.put(`/shop/${id}/`, payload, withJsonHeaders);
  },
  remove(id: string | number) {
    return apiClient.delete(`/shop/${id}/`, withJsonHeaders);
  },
  uploadFile(formData: FormData) {
    return apiClient.post('/shop/uploadFile/', formData, withMultipartHeaders);
  },
  deleteFile(filename: string) {
    return apiClient.get(`/shop/deleteFile/${filename}/`, withJsonHeaders);
  }
};
