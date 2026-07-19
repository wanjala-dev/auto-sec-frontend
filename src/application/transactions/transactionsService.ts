import { normalizeWorkspaceId as normalizeSeedId } from '../../domain/workspace/workspaceId';
import {
  normalizeChildTransactionFeed,
  normalizeTransactionMutationResponse
} from '../../domain/transactions/transactionFeeds';
import { extractUploadMeta } from '../../domain/transactions/receiptUpload';
import { transactionsApi } from '../../infrastructure/transactions/transactionsApi';

export const uploadReceiptFile = async ({
  file,
  seedId
}: {
  file: File;
  seedId?: string | number | null;
}) => {
  if (!file) {
    throw new Error('Select a receipt file before uploading.');
  }

  const resolvedSeedId = normalizeSeedId(seedId) ?? null;
  const formData = new FormData();
  formData.append('file', file);
  if (resolvedSeedId) {
    formData.append('workspace_id', resolvedSeedId);
  }

  const uploadResponse = await transactionsApi.uploadFile(formData);
  const uploadMeta = extractUploadMeta(uploadResponse?.data);

  if (!uploadMeta.fileId) {
    throw new Error('Upload succeeded but no file identifier was returned.');
  }

  return uploadMeta;
};

export const uploadReceiptForTransaction = async ({
  transaction,
  file,
  seedId
}: {
  transaction: any;
  file: File;
  seedId?: string | number | null;
}) => {
  if (!transaction || !transaction.id) {
    throw new Error('A valid transaction is required to upload a receipt.');
  }

  const uploadMeta = await uploadReceiptFile({
    file,
    seedId:
      seedId ??
      normalizeSeedId(transaction.seed_id) ??
      normalizeSeedId(transaction.seed)
  });

  const patchResponse = await transactionsApi.patchTransaction(transaction.id, {
    receipt_file: uploadMeta.fileId
  });

  return {
    uploadMeta,
    updatedTransaction: patchResponse?.data?.data ?? patchResponse?.data ?? null
  };
};

export const requestReceiptForTransaction = async (
  transactionId: string | number
) => {
  const response = await transactionsApi.requestReceipt(transactionId);
  return response?.data?.data ?? response?.data ?? null;
};

export const approveTransaction = async (transactionId: string | number) => {
  const response = await transactionsApi.patchTransaction(transactionId, {
    status: 'approved'
  });
  return response?.data?.data ?? response?.data ?? null;
};

export const fetchReceiptPreviewResource = async (url: string) => {
  const response = await transactionsApi.fetchReceiptPreview(url, 'blob');
  return response?.data;
};

export const createBudgetTransaction = async ({
  seedId,
  payload
}: {
  seedId: string | number;
  payload: Record<string, unknown>;
}) => {
  const response = await transactionsApi.createTransaction(seedId, payload);
  return {
    raw: response?.data ?? null,
    transaction: normalizeTransactionMutationResponse(response?.data)
  };
};

export const fetchChildExpenseTransactions = async ({
  childId,
  seedId,
  filters = {}
}: {
  childId: string | number;
  seedId: string | number;
  filters?: Record<string, unknown>;
}) => {
  const response = await transactionsApi.fetchChildExpenseFeed(
    childId,
    seedId,
    filters
  );
  return normalizeChildTransactionFeed(response?.data);
};

export const fetchChildIncomeTransactions = async ({
  childId,
  seedId
}: {
  childId: string | number;
  seedId: string | number;
}) => {
  const response = await transactionsApi.fetchChildIncomeFeed(childId, seedId);
  return normalizeChildTransactionFeed(response?.data);
};
