export const normalizePaymentList = (payload: any) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }

  return [];
};

export const filterEmptyPaymentEntries = (object: Record<string, any> = {}) =>
  Object.entries(object).reduce((accumulator, [key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      (typeof value !== 'string' || value.trim() !== '') &&
      (!Array.isArray(value) || value.length > 0) &&
      (typeof value !== 'object' ||
        Array.isArray(value) ||
        Object.keys(value).length > 0)
    ) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {} as Record<string, any>);
