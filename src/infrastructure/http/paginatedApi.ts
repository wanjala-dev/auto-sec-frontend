import apiClient from './apiClient';

const normalizePaginatedResponse = (response: any) => {
  const payload = response?.data ?? response;
  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload)
    ? payload
    : [];

  return {
    list,
    count: payload?.count ?? list.length,
    next: payload?.next ?? null,
    previous: payload?.previous ?? null
  };
};

export const fetchPaginatedCollection = async (
  url: string,
  params: Record<string, unknown> = {},
  { maxPages = 10 }: { maxPages?: number } = {}
) => {
  const aggregated = [];
  const visited = new Set();
  let nextUrl = null;
  let page = Number(params?.page) || 1;
  let meta = { count: 0, next: null, previous: null };

  for (let index = 0; index < maxPages; index += 1) {
    const response = await apiClient.get(
      nextUrl || url,
      nextUrl
        ? undefined
        : {
            params: {
              ...params,
              page
            }
          }
    );
    const pageResult = normalizePaginatedResponse(response);
    if (index === 0) {
      meta = {
        count: pageResult.count,
        next: pageResult.next,
        previous: pageResult.previous
      };
    }
    if (Array.isArray(pageResult.list) && pageResult.list.length) {
      aggregated.push(...pageResult.list);
    }
    if (!pageResult.next) {
      meta.next = null;
      break;
    }
    if (visited.has(pageResult.next)) {
      meta.next = pageResult.next;
      break;
    }
    visited.add(pageResult.next);
    nextUrl = pageResult.next;
    page += 1;
  }

  return { items: aggregated, meta };
};
