export const buildTransactionFeedQueryParams = (
  filters: Record<string, unknown> = {},
  pagination: Record<string, unknown> = {}
) => {
  const params: Record<string, unknown> = {};

  Object.entries(filters || {}).forEach(([key, value]) => {
    let normalizedValue = value;

    if (Array.isArray(value)) {
      normalizedValue = value
        .map((entry) =>
          entry !== null && entry !== undefined ? String(entry).trim() : ''
        )
        .filter((entry) => entry.length > 0)
        .join(',');
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      normalizedValue = trimmed.length > 0 ? trimmed : undefined;
    }

    if (normalizedValue !== null && normalizedValue !== undefined) {
      params[key] = normalizedValue;
    }
  });

  if (pagination?.page) {
    params.page = pagination.page;
  }

  if (pagination?.page_size) {
    params.page_size = pagination.page_size;
  }

  return params;
};
