export const normalizeNotificationList = (value: any) => {
  if (!value) return [];
  const payload = value?.data ?? value;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const normalizeNotificationPagination = (value: any) => {
  const payload = value?.data ?? value ?? {};
  const results = normalizeNotificationList(payload);

  return {
    count: payload.count ?? (Array.isArray(results) ? results.length : 0),
    next: payload.next ?? null,
    next_cursor: payload.next_cursor ?? null,
    previous: payload.previous ?? null,
    page_size: payload.page_size ?? null
  };
};

export const normalizeUnreadNotificationsCount = (value: any) =>
  Number(value?.data?.count ?? value?.data ?? value ?? 0) || 0;
