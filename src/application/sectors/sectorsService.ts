import { normalizeSectorCollection } from '../../domain/sectors/sectorCollections';
import { sectorsApi } from '../../infrastructure/sectors/sectorsApi';

export const listOrganizationSectors = async () => {
  const response = await sectorsApi.listOrganizationSectors();
  return normalizeSectorCollection(response?.data);
};
