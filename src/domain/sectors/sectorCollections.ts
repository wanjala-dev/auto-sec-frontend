export const normalizeSectorRow = (sector: any) => {
  if (!sector || typeof sector !== 'object') return null;
  const id =
    sector.id ??
    sector.pk ??
    sector.uuid ??
    sector.slug ??
    sector.code ??
    sector.name ??
    null;
  const name =
    sector.name ??
    sector.title ??
    sector.label ??
    (typeof sector.slug === 'string' ? sector.slug : '') ??
    '';
  const slug =
    sector.slug ??
    sector.code ??
    (typeof name === 'string' ? name.toLowerCase().replace(/\s+/g, '-') : '');
  if (!id && !slug && !name) return null;
  return {
    id: String(id ?? slug ?? name),
    name: String(name || slug || id),
    slug: String(slug || id || name),
    description: sector.description || '',
    icon: sector.icon || ''
  };
};

export const normalizeSectorCollection = (payload: any) => {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload?.data)
    ? payload.data
    : payload?.data && Array.isArray(payload.data?.results)
    ? payload.data.results
    : payload?.data && Array.isArray(payload.data?.data)
    ? payload.data.data
    : [];

  return rows.map(normalizeSectorRow).filter(Boolean);
};
