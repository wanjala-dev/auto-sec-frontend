import {
  normalizeCampaignCollection,
  normalizeCampaignMeta,
  normalizeEventCollection,
  normalizeSponsorCollection,
  normalizeSponsorshipChild,
  normalizeSponsorshipChildren,
  normalizeStatusUpdate,
  normalizeStatusUpdateCollection
} from '../../domain/sponsorship/sponsorCollections';
import { buildTransactionFeedQueryParams } from '../../domain/transactions/feedQuery';
import { sponsorshipApi } from '../../infrastructure/sponsorship/sponsorshipApi';

export const listCampaigns = async (
  workspaceId: string | number,
  params: Record<string, unknown> = {}
) => {
  const response = await sponsorshipApi.listCampaigns(workspaceId, params);
  const payload = response?.data || {};
  return {
    items: normalizeCampaignCollection(payload),
    total: payload?.results?.count ?? payload?.count ?? payload?.total ?? 0
  };
};

export const createCampaign = async (payload: Record<string, unknown>) => {
  const response = await sponsorshipApi.createCampaign(payload);
  return response?.data ?? null;
};

export const createSponsorshipRecipients = async (
  payload: Array<Record<string, unknown>>
) => {
  const response = await sponsorshipApi.createRecipients(payload);
  return response?.data ?? null;
};

export const createManualDonation = async (
  seedId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await sponsorshipApi.createDonation(seedId, payload);
  return response?.data ?? null;
};

export const listWorkspaceDonations = async ({
  seedId,
  filters = {},
  page = 1,
  page_size,
  maxPages = 50
}: {
  seedId: string | number | null | undefined;
  filters?: Record<string, unknown>;
  page?: number;
  page_size?: number;
  maxPages?: number;
}) => {
  if (!seedId) {
    return {
      items: [],
      meta: {
        count: 0,
        next: null,
        previous: null
      }
    };
  }

  return sponsorshipApi.listDonationsPaginated(seedId, {
    params: buildTransactionFeedQueryParams(filters, { page, page_size }),
    maxPages
  });
};

export const listTeamEvents = async (
  seedId: string | number,
  params: Record<string, unknown> = {}
) => {
  const response = await sponsorshipApi.listTeamEvents(seedId, params);
  return normalizeEventCollection(response?.data);
};

export const createTeamEvent = async (
  seedId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await sponsorshipApi.createTeamEvent(seedId, payload);
  return response?.data ?? null;
};

export const fetchCampaignMeta = async (seedId: string | number) => {
  const response = await sponsorshipApi.getCampaignMeta(seedId);
  return normalizeCampaignMeta(response?.data);
};

export const listSponsorshipChildren = async (
  seedId: string | number,
  params: Record<string, unknown> = {}
) => {
  const response = await sponsorshipApi.listChildren(seedId, params);
  return normalizeSponsorshipChildren(response?.data);
};

export const fetchSponsorshipChildDetails = async (
  seedId: string | number,
  childId: string | number
) => {
  const response = await sponsorshipApi.getChildDetails(seedId, childId);
  return normalizeSponsorshipChild(response?.data);
};

export const listChildSponsors = async (childId: string | number) => {
  const response = await sponsorshipApi.listChildSponsors(childId);
  return normalizeSponsorCollection(response?.data);
};

export const listChildStatusUpdates = async (
  seedId: string | number,
  childId: string | number
) => {
  const response = await sponsorshipApi.listChildStatusUpdates(seedId, childId);
  return normalizeStatusUpdateCollection(response?.data);
};

export const fetchChildStatusUpdate = async (
  seedId: string | number,
  childId: string | number,
  updateId: string | number
) => {
  const response = await sponsorshipApi.getChildStatusUpdate(
    seedId,
    childId,
    updateId
  );
  return normalizeStatusUpdate(response?.data);
};

export const createChildStatusUpdate = async (
  payload: Record<string, unknown>
) => {
  const response = await sponsorshipApi.createChildStatusUpdate(payload);
  return response?.data ?? null;
};

export const editChildStatusUpdate = async (
  updateId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await sponsorshipApi.updateChildStatusUpdate(
    updateId,
    payload
  );
  return response?.data ?? null;
};

export const deleteChildStatusUpdate = async (updateId: string | number) => {
  const response = await sponsorshipApi.deleteChildStatusUpdate(updateId);
  return response?.data ?? null;
};

export const updateSponsorshipChild = async ({
  seedId,
  childId,
  payload
}: {
  seedId?: string | number | null;
  childId: string | number;
  payload: Record<string, unknown>;
}) => {
  try {
    const response =
      seedId !== null && seedId !== undefined && seedId !== ''
        ? await sponsorshipApi.patchChild(seedId, childId, payload)
        : await sponsorshipApi.patchLegacyChild(childId, payload);

    return normalizeSponsorshipChild(response?.data);
  } catch (error: any) {
    if (
      seedId &&
      (error?.response?.status === 404 || error?.response?.status === 405)
    ) {
      const fallback = await sponsorshipApi.patchLegacyChild(childId, payload);
      return normalizeSponsorshipChild(fallback?.data);
    }
    throw error;
  }
};

export const capturePayPalDonation = async (
  payload: Record<string, unknown>
) => {
  const response = await sponsorshipApi.capturePayPalDonation(payload);
  return response?.data ?? null;
};

export const completeBraintreeDonation = async (
  payload: Record<string, unknown>
) => {
  const response = await sponsorshipApi.completeBraintreeDonation(payload);
  return response?.data ?? null;
};
