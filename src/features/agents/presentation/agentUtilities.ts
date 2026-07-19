export const DEFAULT_AI_ALIAS = 'Orchestrator Agent';

export const makePossessive = (name) => {
  if (!name || typeof name !== 'string') return "Orchestrator Agent's";
  const trimmed = name.trim();
  if (!trimmed) return "Orchestrator Agent's";
  const lastChar = trimmed.charAt(trimmed.length - 1);
  if (lastChar === "'" || lastChar === '’') {
    return `${trimmed}`;
  }
  if (/[sS]$/.test(trimmed)) {
    return `${trimmed}'`;
  }
  return `${trimmed}'s`;
};

export const ensureAbsoluteUrl = (candidate, baseUrl) => {
  if (!candidate || typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (!baseUrl) {
    return trimmed;
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const normalizeApiPath = (candidate, baseUrl) => {
  if (!candidate || typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    if (!baseUrl) return trimmed;
    try {
      const source = new URL(trimmed);
      const base = new URL(baseUrl);
      if (source.origin === base.origin) {
        return `${source.pathname}${source.search || ''}`;
      }
    } catch (error) {
      return trimmed;
    }
    return trimmed;
  }
  return `/${trimmed.replace(/^\/+/, '')}`;
};

const DOWNLOAD_URL_FIELDS = [
  'download_url',
  'signed_url',
  'file_url',
  'url',
  'file',
  'path',
  'location',
  'href',
  'link'
];

export const extractDownloadUrl = (payload, visited = new Set()) => {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractDownloadUrl(item, visited);
      if (found) return found;
    }
    return null;
  }

  if (typeof payload === 'object') {
    if (visited.has(payload)) return null;
    visited.add(payload);

    for (const field of DOWNLOAD_URL_FIELDS) {
      const value = payload[field];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    for (const value of Object.values(payload)) {
      const found = extractDownloadUrl(value, visited);
      if (found) return found;
    }
  }

  return null;
};

export const resolvePdfUrl = (document, apiBaseUrl, uploadsById = null) => {
  if (!document) return null;
  const { raw = {}, pdfId, fileId } = document;

  const candidateFields = [
    document.pdfUrl,
    raw.pdf_url,
    raw.url,
    raw.file_url,
    raw.download_url,
    raw.signed_url,
    raw.file,
    raw.path,
    raw.location,
    raw?.pdf?.download_url,
    raw?.pdf?.signed_url,
    raw?.pdf?.file_url,
    raw?.pdf?.url,
    raw?.pdf?.file,
    raw?.pdf?.path,
    raw?.pdf?.location
  ];

  for (const value of candidateFields) {
    const resolved = ensureAbsoluteUrl(value, apiBaseUrl);
    if (resolved) {
      return resolved;
    }
  }

  const lookupId = fileId || pdfId;
  if (lookupId && uploadsById) {
    const key = String(lookupId);
    const record = uploadsById.get(key) || uploadsById.get(lookupId);
    if (record?.file) {
      return ensureAbsoluteUrl(record.file, apiBaseUrl);
    }
  }

  return null;
};

export const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) return '';
  const kb = 1024;
  const mb = kb * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(1)} MB`;
  if (bytes >= kb) return `${Math.round(bytes / kb)} KB`;
  return `${bytes} B`;
};

export const extractPlainText = (value) => {
  if (!value) return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
