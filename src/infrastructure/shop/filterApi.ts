import apiClient from '../http/apiClient';

const withJsonHeaders = {
  headers: {
    'Content-Type': 'application/json'
  }
};

export const filterApi = {
  getByPath(path: string) {
    return apiClient.get(path, withJsonHeaders);
  }
};
