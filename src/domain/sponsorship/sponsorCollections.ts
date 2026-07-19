export const normalizeSponsorCollection = (payload: any) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.sponsors)) return payload.sponsors;
  return [];
};

/** C1 money object ({amount_minor, currency}) → major-unit number. */
const moneyToNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    const minor = Number(value.amount_minor);
    return Number.isFinite(minor) ? minor / 100 : null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const normalizeSponsorshipChild = (payload: any) => {
  if (!payload) return null;
  const record =
    payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  // Anonymous/non-member callers get the PII-safe PUBLIC projection
  // ({type:'recipient', title:'Zawadi M.', hero_image_url, fundraising:{…}})
  // instead of the full recipient record. Adapt it to the card-friendly shape
  // (first_name / photo_url / total_raised…) so public surfaces — the designed
  // donation form hero and the sponsor checkout — render it instead of
  // "Recipient details unavailable".
  if (
    record &&
    typeof record === 'object' &&
    !record.first_name &&
    record.type === 'recipient' &&
    record.title
  ) {
    const fundraising = record.fundraising || {};
    return {
      ...record,
      first_name: record.title,
      last_name: '',
      photo_url: record.photo_url || record.hero_image_url || '',
      story: record.story || record.description || '',
      total_raised: moneyToNumber(fundraising.raised_amount),
      goal_amount: moneyToNumber(fundraising.goal_amount),
      currency: record.currency || fundraising.currency || undefined,
      workspace: record.workspace ?? record.workspace_id ?? null
    };
  }
  return record;
};

export const normalizeSponsorshipChildren = (payload: any) => {
  const resultsPayload = payload?.results ?? payload ?? {};
  const results = Array.isArray(resultsPayload?.results)
    ? resultsPayload.results
    : Array.isArray(resultsPayload?.data)
    ? resultsPayload.data
    : Array.isArray(resultsPayload)
    ? resultsPayload
    : [];

  return {
    results,
    totalChildren:
      resultsPayload?.total_children ??
      payload?.total_children ??
      results.length,
    totalSponsored:
      resultsPayload?.total_sponsored ?? payload?.total_sponsored ?? 0,
    totalPending: resultsPayload?.total_pending ?? payload?.total_pending ?? 0
  };
};

export const normalizeStatusUpdateCollection = (payload: any) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export const normalizeStatusUpdate = (payload: any) => {
  if (!payload) return null;
  if (payload?.data && typeof payload.data === 'object') {
    return payload.data;
  }
  return payload;
};

export const normalizeCampaignCollection = (payload: any) => {
  if (!payload) return [];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.results?.results)) return payload.results.results;
  if (Array.isArray(payload?.results?.data)) return payload.results.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const normalizeEventCollection = (payload: any) => {
  if (!payload) return [];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.results?.results)) return payload.results.results;
  if (Array.isArray(payload?.results?.data)) return payload.results.data;
  if (Array.isArray(payload?.events)) return payload.events;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const normalizeCampaignMeta = (payload: any) => ({
  ...(payload || {}),
  categories: Array.isArray(payload?.categories) ? payload.categories : [],
  budgets: Array.isArray(payload?.budgets) ? payload.budgets : []
});
