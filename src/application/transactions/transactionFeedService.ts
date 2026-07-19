import { buildTransactionFeedQueryParams } from '../../domain/transactions/feedQuery';
import { normalizeWorkspaceId as normalizeSeedId } from '../../domain/workspace/workspaceId';
import { transactionsApi } from '../../infrastructure/transactions/transactionsApi';

type TransactionFeedOptions = {
  seedId: string | number | null | undefined;
  filters?: Record<string, unknown>;
  page?: number;
  page_size?: number;
  maxPages?: number;
};

const EMPTY_FEED = {
  items: [],
  meta: {
    count: 0,
    next: null,
    previous: null
  }
};

export const listSeedTransactions = async ({
  seedId,
  filters = {},
  page = 1,
  page_size,
  maxPages = 50
}: TransactionFeedOptions) => {
  const normalizedSeedId = normalizeSeedId(seedId);

  if (!normalizedSeedId) {
    return EMPTY_FEED;
  }

  return transactionsApi.listTransactionsPaginated(normalizedSeedId, {
    params: buildTransactionFeedQueryParams(filters, { page, page_size }),
    maxPages
  });
};

export const listSeedIncomeTransactions = async ({
  seedId,
  filters = {},
  page = 1,
  page_size,
  maxPages = 50
}: TransactionFeedOptions) =>
  listSeedTransactions({
    seedId,
    filters: {
      ...filters,
      transaction_type: ['income', 'donation']
    },
    page,
    page_size,
    maxPages
  });

export const listSeedExpenseTransactions = async ({
  seedId,
  filters = {},
  page = 1,
  page_size,
  maxPages = 50
}: TransactionFeedOptions) =>
  listSeedTransactions({
    seedId,
    filters: {
      ...filters,
      transaction_type: 'expense'
    },
    page,
    page_size,
    maxPages
  });
