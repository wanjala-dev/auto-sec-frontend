const buildUploadUrl = (path: string) => {
  if (!path) return '';
  const trimmed = String(path).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')) {
    return trimmed;
  }

  const baseUrl =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_BASE_URL ||
    window.location.origin;

  if (!baseUrl) return trimmed;

  const sanitizedBase = baseUrl.replace(/\/+$/, '');
  const sanitizedPath = trimmed.replace(/^\/+/, '');
  return `${sanitizedBase}/${sanitizedPath}`;
};

export const extractUploadMeta = (payload: any = {}) => {
  if (!payload) return {};
  if (payload.data) return extractUploadMeta(payload.data);

  const urlCandidates = [
    payload.file_url,
    payload.file,
    payload.url,
    payload.location,
    payload.path,
    payload.fileName,
    payload.file_name
  ];

  const resolvedUrl = urlCandidates.find(
    (candidate) => typeof candidate === 'string' && candidate.trim().length
  );

  // ``file_path`` is the stable storage key the backend tracks.
  // Surface it so callers that want signing-at-read (e.g. the
  // recipient flow) can store the key instead of the URL. The
  // multipart upload endpoint and the presigned-PUT helper both
  // populate this.
  const filePathCandidates = [
    payload.file_path,
    payload.key,
    payload.storage_key
  ];
  const resolvedFilePath = filePathCandidates.find(
    (candidate) => typeof candidate === 'string' && candidate.trim().length
  );

  return {
    url: buildUploadUrl(resolvedUrl || ''),
    id: payload?.file_id ?? payload?.id ?? payload?.pk ?? payload?.uuid ?? null,
    file_path: resolvedFilePath || ''
  };
};
