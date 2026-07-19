import { normalizeApiBannerCollection } from '../../domain/announcements/bannerCollections';
import { announcementsApi } from '../../infrastructure/announcements/announcementsApi';

export const listWorkspaceBanners = async (
  workspaceId: string | number,
  params: Record<string, unknown> = {}
) => {
  const response = await announcementsApi.listBanners({
    seed: workspaceId,
    ...(params || {})
  });
  return normalizeApiBannerCollection(response?.data, workspaceId);
};
