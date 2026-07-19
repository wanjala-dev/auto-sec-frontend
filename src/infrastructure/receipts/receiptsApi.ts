import apiClient from '../http/apiClient';

export const receiptsApi = {
  list: (params: { workspace: string; context?: string; limit?: number }) =>
    apiClient.get('/receipts/', { params })
};
