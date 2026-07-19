import apiClient from '../http/apiClient';

export const sectorsApi = {
  listOrganizationSectors: () => apiClient.get('/sectors/?for_org=1')
};
