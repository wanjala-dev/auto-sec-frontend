export const extractUploadMeta = (payload: any = {}) => {
  if (!payload) return {};
  if (payload.data) return extractUploadMeta(payload.data);
  if (payload.file) {
    return {
      url: payload.file,
      fileId: payload.file_id ?? payload.id ?? payload.pk ?? null
    };
  }
  if (payload.url || payload.location) {
    return {
      url: payload.url ?? payload.location ?? null,
      fileId: payload.file_id ?? payload.id ?? payload.pk ?? null
    };
  }
  return {
    url: payload.file_url ?? payload.file ?? null,
    fileId: payload.file_id ?? payload.id ?? payload.pk ?? null
  };
};
