import { buildChildAggregateParams } from '../../domain/childLedger/aggregateParams';
import { childLedgerApi } from '../../infrastructure/childLedger/childLedgerApi';

export const fetchChildAggregate = async ({
  seedId,
  childId,
  currency,
  asOf,
  statuses,
  refresh,
  includeAllocations,
  includeSponsors,
  sponsorLimit,
  signal
}: any) => {
  if (!seedId || !childId) return null;

  const response = await childLedgerApi.getChildAggregate(
    seedId,
    childId,
    buildChildAggregateParams({
      currency,
      asOf,
      statuses,
      refresh,
      includeAllocations,
      includeSponsors,
      sponsorLimit
    }),
    signal
  );

  return response?.data ?? null;
};
