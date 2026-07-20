import { normalizeSearchSections } from '../../domain/search/searchSections';
import { searchApi } from '../../infrastructure/search/searchApi';

const buildSearchParams = ({
  query,
  limit,
  sections,
  startDate,
  endDate
}: {
  query: string;
  limit: number;
  sections?: string[];
  startDate?: string | null;
  endDate?: string | null;
}) => {
  const params: Record<string, unknown> = {
    q: query,
    limit
  };

  if (Array.isArray(sections) && sections.length) {
    params.sections = sections.join(',');
  }

  if (startDate) {
    params.start_date = startDate;
  }

  if (endDate) {
    params.end_date = endDate;
  }

  return params;
};

export const searchAggregate = async ({
  query,
  limit,
  sections = [],
  startDate = null,
  endDate = null,
  displayOrder = []
}: {
  query: string;
  limit: number;
  sections?: string[];
  startDate?: string | null;
  endDate?: string | null;
  displayOrder?: string[];
}) => {
  const response = await searchApi.aggregate(
    buildSearchParams({
      query,
      limit,
      sections,
      startDate,
      endDate
    })
  );

  return normalizeSearchSections(response?.data?.sections || {}, displayOrder);
};

export const searchSuggestions = async ({
  query,
  limit,
  seedId = null,
  displayOrder = [],
  signal
}: {
  query: string;
  limit: number;
  seedId?: string | null;
  displayOrder?: string[];
  signal?: AbortSignal;
}) => {
  const params: Record<string, unknown> = {
    q: query,
    limit
  };
  if (seedId) {
    // Narrow the suggest scope to the active workspace; the backend 403s
    // workspace ids outside the requester's memberships.
    params.workspace_id = seedId;
  }
  const response = await searchApi.suggest(
    params,
    signal ? { signal } : undefined
  );

  return normalizeSearchSections(response?.data?.sections || {}, displayOrder);
};
