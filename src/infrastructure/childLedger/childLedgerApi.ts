import apiClient from '../http/apiClient';

export const childLedgerApi = {
  getChildAggregate: (
    seedId: string | number,
    childId: string | number,
    params: Record<string, unknown>,
    signal?: AbortSignal
  ) =>
    apiClient.get(`/sponsorship/recipients/${seedId}/${childId}/summary/`, {
      params,
      signal
    })
};
