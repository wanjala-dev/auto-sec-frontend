import apiClient from '../http/apiClient';

export const searchApi = {
  aggregate: (params?: Record<string, unknown>) =>
    apiClient.get('/search/aggregate/', params ? { params } : undefined),

  suggest: (
    params?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) =>
    apiClient.get('/search/suggest/', {
      ...(params ? { params } : {}),
      ...(config || {})
    })
};
