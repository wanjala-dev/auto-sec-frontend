import apiClient from '../http/apiClient';
import { fetchPaginatedCollection } from '../http/paginatedApi';

// In-flight coalescing for the sponsor transparency report. The page and the
// RightSideBar "Giving Insights" widget both request it on mount, so without
// coalescing two identical concurrent GETs hit a request-time-aggregating
// endpoint and contend (~6s each vs ~200ms for a single call). Concurrent
// callers for the same workspace share ONE round-trip; the entry clears the
// moment the request settles, so there is no stale cache.
const _transparencyInFlight = new Map<string, Promise<any>>();

export const sponsorshipApi = {
  createDonation: (seedId: string | number, payload: Record<string, unknown>) =>
    apiClient.post(`/sponsorship/donations/${seedId}/`, payload),

  reviewDonation: (
    donationId: string | number,
    decision: 'approve' | 'reject'
  ) =>
    apiClient.post(`/sponsorship/donations/${donationId}/review/`, {
      decision
    }),

  listDonationsPaginated: (
    seedId: string | number,
    {
      params,
      maxPages = 50
    }: {
      params?: Record<string, unknown>;
      maxPages?: number;
    } = {}
  ) =>
    fetchPaginatedCollection(`/sponsorship/donations/${seedId}/`, params, {
      maxPages
    }),

  // Sponsor-facing transparency report — the authenticated sponsor's own
  // giving to this workspace and how that money was spent on their behalf
  // (scoped server-side by the requester's email; no admin permission).
  // Backend: SponsorTransparencyView (IsAuthenticated).
  getSponsorTransparency: (seedId: string | number) => {
    const key = String(seedId);
    const existing = _transparencyInFlight.get(key);
    if (existing) return existing;
    const request = apiClient
      .get(`/sponsorship/transparency/${key}/`)
      .finally(() => {
        _transparencyInFlight.delete(key);
      });
    _transparencyInFlight.set(key, request);
    return request;
  },

  // The authenticated sponsor's own recurring sponsorships in a workspace
  // (email-scoped server-side; PII-safe recipient names). Read-only
  // self-service. Backend: MySponsorshipsView (IsAuthenticated).
  getMySponsorships: (seedId: string | number) =>
    apiClient.get(`/sponsorship/sponsorships/my/${seedId}/`),

  // PII-safe public recipient cards (id, PII-safe name, photo_url, goal /
  // raised). Used to enrich the sponsor "who you're supporting" strip with a
  // real photo + funding progress, matched to a sponsorship's recipient_id.
  getPublicRecipients: (seedId: string | number) =>
    apiClient.get(`/sponsorship/recipients/public/workspaces/${seedId}/`),

  // The authenticated sponsor's own receipts (tax docs) in a workspace,
  // scoped by payer_email server-side. Backend: MyReceiptsController
  // (IsAuthenticated) at GET /receipts/mine/<workspace_id>/.
  getMyReceipts: (seedId: string | number) =>
    apiClient.get(`/receipts/mine/${seedId}/`),

  // A recipient's structured needs (admin). Backend: RecipientNeedsView
  // (IsWorkspaceAdmin) at /sponsorship/recipients/<ws>/<id>/needs/.
  getRecipientNeeds: (seedId: string | number, recipientId: string | number) =>
    apiClient.get(`/sponsorship/recipients/${seedId}/${recipientId}/needs/`),

  // Replace-set bulk upsert of a recipient's structured needs (admin).
  // ``needs`` is an array of { id?, label, estimated_amount, currency?,
  // description?, position?, status?, is_public? }. The backend recomputes
  // the recipient's derived goal_amount = sum of open needs.
  saveRecipientNeeds: (
    seedId: string | number,
    recipientId: string | number,
    needs: Array<Record<string, unknown>>
  ) =>
    apiClient.post(`/sponsorship/recipients/${seedId}/${recipientId}/needs/`, {
      needs
    }),

  // Pause / resume / cancel the sponsor's OWN recurring sponsorship — one
  // of the three sanctioned sponsor writes (gated to the owner by email
  // server-side). Backend: ManageSponsorshipController (IsAuthenticated).
  manageSponsorship: (
    sponsorshipId: string | number,
    action: 'pause' | 'resume' | 'cancel'
  ) =>
    apiClient.post(`/sponsorship/sponsors/${sponsorshipId}/manage/`, {
      action
    }),

  getChildDetails: (seedId: string | number, childId: string | number) =>
    apiClient.get(`/sponsorship/recipients/${seedId}/${childId}/`),

  listChildren: (seedId: string | number, params?: Record<string, unknown>) =>
    apiClient.get(
      `/sponsorship/recipients/${seedId}/`,
      params ? { params } : undefined
    ),

  listCampaigns: (
    workspaceId: string | number,
    params?: Record<string, unknown>
  ) =>
    apiClient.get('/campaigns/', {
      params: { workspace_id: workspaceId, ...(params || {}) }
    }),

  createCampaign: (payload: Record<string, unknown>) =>
    apiClient.post('/campaigns/', payload),

  updateCampaign: (
    campaignId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/campaigns/${campaignId}/`, payload),

  createRecipients: (payload: Array<Record<string, unknown>>) =>
    apiClient.post('/sponsorship/recipients/', payload),

  listTeamEvents: (seedId: string | number, params?: Record<string, unknown>) =>
    // Hung-backend guard: apiClient has no global timeout, so a cold/recovering
    // API would leave the events list spinning on "Loading events…" forever.
    // A bounded timeout makes the request reject, surfacing the retry UI instead.
    apiClient.get(`/events/workspaces/${seedId}/`, {
      ...(params ? { params } : {}),
      timeout: 20000
    }),

  createTeamEvent: (
    seedId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.post(`/events/workspaces/${seedId}/`, payload),

  updateEvent: (eventId: string | number, payload: Record<string, unknown>) =>
    apiClient.patch(`/events/${eventId}/`, payload),

  transitionEventLifecycle: (
    eventId: string | number,
    payload: {
      transition: 'schedule' | 'go_live' | 'pause' | 'resume' | 'end' | 'reset';
      scheduled_at?: string | null;
    }
  ) => apiClient.post(`/events/${eventId}/lifecycle/`, payload),

  getCampaignMeta: (seedId: string | number) =>
    apiClient.get(`/campaigns/meta/${seedId}/`),

  listChildSponsors: (childId: string | number) =>
    apiClient.get(`/sponsorship/sponsor/recipient/${childId}`),

  listProjectSponsors: (projectId: string | number) =>
    apiClient.get(`/sponsorship/sponsor/project/${projectId}`),

  listChildStatusUpdates: (seedId: string | number, childId: string | number) =>
    apiClient.get(`/sponsorship/recipients/update/${seedId}/${childId}/`),

  getChildStatusUpdate: (
    seedId: string | number,
    childId: string | number,
    updateId: string | number
  ) =>
    apiClient.get(
      `/sponsorship/recipients/update/${seedId}/${childId}/${updateId}/`
    ),

  createChildStatusUpdate: (payload: Record<string, unknown>) =>
    apiClient.post('/sponsorship/recipients/update/', payload),

  getRecipientUpdateDetail: (updateId: string | number) =>
    apiClient.get(`/sponsorship/recipients/update/${updateId}/`),

  updateChildStatusUpdate: (
    updateId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/sponsorship/recipients/update/${updateId}/`, payload),

  deleteChildStatusUpdate: (updateId: string | number) =>
    apiClient.delete(`/sponsorship/recipients/update/${updateId}/`),

  listRecipientUpdateComments: (updateId: string | number) =>
    apiClient.get(`/sponsorship/recipients/update/${updateId}/comments/`),

  createRecipientUpdateComment: (
    updateId: string | number,
    payload: { body: string; parent_id?: number | null }
  ) =>
    apiClient.post(
      `/sponsorship/recipients/update/${updateId}/comments/`,
      payload
    ),

  deleteRecipientUpdateComment: (
    updateId: string | number,
    commentId: number
  ) =>
    apiClient.delete(
      `/sponsorship/recipients/update/${updateId}/comments/${commentId}/`
    ),

  patchChild: (
    seedId: string | number,
    childId: string | number,
    payload: Record<string, unknown>
  ) =>
    apiClient.patch(`/sponsorship/recipients/${seedId}/${childId}/`, payload),

  patchLegacyChild: (
    childId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/sponsorship/recipients/${childId}/`, payload),

  capturePayPalDonation: (payload: Record<string, unknown>) =>
    apiClient.post('/sponsorship/donations/paypal/capture/', payload),

  completeBraintreeDonation: (payload: Record<string, unknown>) =>
    apiClient.post('/sponsorship/donations/braintree/transaction/', payload)
};

export const fetchProjectSponsors = async (projectId: string | number) => {
  const response = await apiClient.get(
    `/sponsorship/sponsor/project/${projectId}`
  );
  return response?.data;
};
