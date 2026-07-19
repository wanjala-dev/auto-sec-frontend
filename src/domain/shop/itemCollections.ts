export const SHOP_ITEM_PLACEHOLDER_THUMBNAIL =
  'https://www.slntechnologies.com/wp-content/uploads/2017/08/ef3-placeholder-image.jpg';

export const normalizeShopPath = (url = '') => {
  const raw = String(url || '').trim();
  if (!raw.length) {
    return '/shop/';
  }

  const prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  return prefixed.replace(/\/{2,}/g, '/');
};

export const resolveShopItemThumbnail = (
  item: { thumbnail?: string | null } = {},
  uploadedThumbnail?: string | null
) => {
  if (uploadedThumbnail) {
    return uploadedThumbnail;
  }

  if (item?.thumbnail) {
    return item.thumbnail;
  }

  return SHOP_ITEM_PLACEHOLDER_THUMBNAIL;
};

export const extractShopFilename = (value?: string | null) => {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
};
