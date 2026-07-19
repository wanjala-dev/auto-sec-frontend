import apiClient from '../http/apiClient';

export const unifiedDocumentsApi = {
  list: (params: {
    workspace: string;
    source?: string;
    file_type?: string;
    limit?: number;
  }) => apiClient.get('/documents/', { params })
};
