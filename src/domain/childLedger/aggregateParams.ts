export const normalizeLedgerStatuses = (
  statuses: string | string[] | null | undefined
) => {
  if (!statuses) return undefined;
  if (Array.isArray(statuses)) {
    const filtered = statuses.filter((status) => status);
    return filtered.length ? filtered.join(',') : undefined;
  }
  const value = String(statuses).trim();
  return value.length ? value : undefined;
};

export const buildChildAggregateParams = ({
  currency = 'USD',
  asOf,
  statuses,
  refresh,
  includeAllocations,
  includeSponsors,
  sponsorLimit
}: any = {}) => {
  const normalizedStatuses = normalizeLedgerStatuses(statuses);
  const params = {
    currency,
    as_of: asOf || undefined,
    statuses: normalizedStatuses,
    refresh: refresh ? true : undefined,
    include_allocations:
      typeof includeAllocations === 'boolean' ? includeAllocations : undefined,
    include_sponsors:
      typeof includeSponsors === 'boolean' ? includeSponsors : undefined,
    sponsor_limit: Number.isFinite(Number(sponsorLimit))
      ? Number(sponsorLimit)
      : undefined
  };

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  );
};
