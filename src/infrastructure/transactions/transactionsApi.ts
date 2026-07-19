import apiClient from '../http/apiClient';
import { fetchPaginatedCollection } from '../http/paginatedApi';

// The nonprofit `budget` context was removed in the Auto-Sec fork, so every
// `/budget/*` endpoint 404s. These transaction reads are auto-fired on workspace
// resolve and were surfacing as uncaught 404s. Until/unless a security ledger
// replaces them, they resolve empty without hitting the server. (Deliberate
// no-op, not a swallowed error — the endpoints genuinely no longer exist.)
const BUDGET_REMOVED = true;

export const transactionsApi = {
  uploadFile: (formData: FormData) =>
    apiClient.post('/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  createTransaction: (
    seedId: string | number,
    payload: Record<string, unknown>
  ) =>
    BUDGET_REMOVED
      ? Promise.resolve({ data: null })
      : apiClient.post(`/budget/transaction/${seedId}`, payload),

  fetchChildExpenseFeed: (
    childId: string | number,
    seedId: string | number,
    params?: Record<string, unknown>
  ) =>
    BUDGET_REMOVED
      ? Promise.resolve({ data: [] })
      : apiClient.get(
          `/budget/transaction/recipient/expense/${childId}/${seedId}`,
          { params }
        ),

  fetchChildIncomeFeed: (childId: string | number, seedId: string | number) =>
    BUDGET_REMOVED
      ? Promise.resolve({ data: [] })
      : apiClient.get(
          `/budget/transaction/recipient/income/${childId}/${seedId}`
        ),

  listTransactionsPaginated: (
    seedId: string | number,
    {
      params,
      maxPages = 50
    }: {
      params?: Record<string, unknown>;
      maxPages?: number;
    } = {}
  ) =>
    BUDGET_REMOVED
      ? Promise.resolve([])
      : fetchPaginatedCollection(`/budget/transaction/${seedId}`, params, {
          maxPages
        }),

  patchTransaction: (
    transactionId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/budget/transaction/${transactionId}/`, payload),

  requestReceipt: (transactionId: string | number) =>
    apiClient.post(`/budget/transaction/${transactionId}/request-receipt/`, {}),

  fetchReceiptPreview: (url: string, responseType: 'blob' = 'blob') =>
    apiClient.get(url, { responseType }),

  importTransactions: (
    seedId: string | number,
    formData: FormData,
    params?: Record<string, string>,
    onUploadProgress?: (progressEvent: any) => void
  ) => {
    const file: File | null = formData.get('file') as File | null;
    const ext = file?.name?.split('.').pop()?.toLowerCase() ?? '';
    const isCSV = ext === 'csv';
    const endpoint = isCSV
      ? `/budget/import-expenses/${seedId}/`
      : `/budget/import-document/${seedId}/`;
    const queryParams = new URLSearchParams(params || {});
    if (!isCSV) queryParams.set('mode', 'expense');
    const qs = queryParams.toString();
    return apiClient.post(qs ? `${endpoint}?${qs}` : endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    });
  }
};
