import {
  extractShopFilename,
  resolveShopItemThumbnail
} from '../../domain/shop/itemCollections';
import { itemApi } from '../../infrastructure/shop/itemApi';

export const listShopItems = async (path: string) => {
  const response = await itemApi.list(path);
  return response?.data;
};

export const searchShopItems = async (keyword: string) => {
  const response = await itemApi.search(keyword);
  return response?.data;
};

export const getShopItemById = async (path: string, id: string | number) => {
  const response = await itemApi.getById(path, id);
  return response?.data;
};

export const listShopProductImages = async (id: string | number) => {
  const response = await itemApi.listProductImages(id);
  return response?.data;
};

export const addShopProductImages = async (
  productId: string | number,
  files: File[] = []
) => {
  for (const file of files) {
    const formData = new FormData();
    formData.append('imgFile', file);
    const uploadResponse = await itemApi.uploadFile(formData);
    const imageUrl = uploadResponse?.data?.imgFile;
    if (!imageUrl) {
      continue;
    }
    await itemApi.createProductImage({
      productId,
      url: imageUrl
    });
  }
};

export const deleteShopProductImage = async (
  imageId: string | number,
  fileUrl?: string | null
) => {
  const response = await itemApi.deleteProductImage(imageId);
  const filename = extractShopFilename(fileUrl);
  if (filename) {
    try {
      await itemApi.deleteFile(filename);
    } catch (_) {}
  }
  return response?.data;
};

export const listShopItemsByCategory = async (category: string) => {
  const response = await itemApi.listByCategory(category);
  return response?.data;
};

export const createShopItem = async (
  item: Record<string, unknown>,
  file?: File | null
) => {
  let thumbnail = resolveShopItemThumbnail(item);

  if (file) {
    const formData = new FormData();
    formData.append('imgFile', file);
    const uploadResponse = await itemApi.uploadFile(formData);
    thumbnail = resolveShopItemThumbnail(item, uploadResponse?.data?.imgFile);
  }

  const response = await itemApi.create({
    ...item,
    thumbnail
  });

  return response?.data;
};

export const updateShopItem = async (
  id: string | number,
  item: Record<string, unknown>,
  file?: File | null
) => {
  let nextPayload = { ...item };
  const previousFilename = extractShopFilename(
    typeof item?.thumbnail === 'string' ? item.thumbnail : null
  );

  if (file) {
    const formData = new FormData();
    formData.append('imgFile', file);
    const uploadResponse = await itemApi.uploadFile(formData);
    nextPayload = {
      ...item,
      thumbnail: resolveShopItemThumbnail(item, uploadResponse?.data?.imgFile)
    };
  }

  const response = await itemApi.update(id, nextPayload);

  if (file && previousFilename) {
    try {
      await itemApi.deleteFile(previousFilename);
    } catch (_) {}
  }

  return response?.data;
};

export const deleteShopItem = async (
  id: string | number,
  filename?: string | null
) => {
  const response = await itemApi.remove(id);

  if (filename) {
    try {
      await itemApi.deleteFile(filename);
    } catch (_) {}
  }

  return response?.data;
};
