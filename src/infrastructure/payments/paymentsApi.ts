import apiClient from '../http/apiClient';

export const paymentsApi = {
  getBillingOverview: (workspaceId: string | number) =>
    apiClient.get('/workspaces/billing/overview/', {
      params: { workspace_id: workspaceId }
    }),

  listBillingMethods: (workspaceId: string | number) =>
    apiClient.get('/workspaces/billing/payment-methods/', {
      params: { workspace_id: workspaceId }
    }),

  listBillingPlans: (workspaceId?: string | number | null) =>
    apiClient.get('/workspaces/billing/plans/', {
      params: workspaceId ? { workspace_id: workspaceId } : undefined
    }),

  getBillingPlanPreview: (
    workspaceId: string | number,
    planId: string | number
  ) =>
    apiClient.get('/workspaces/billing/plan/preview/', {
      params: { workspace_id: workspaceId, plan_id: planId }
    }),

  createBillingSetupIntent: (workspaceId: string | number) =>
    apiClient.post('/workspaces/billing/payment-methods/setup-intent/', {
      workspace_id: workspaceId
    }),

  setBillingDefaultMethod: (
    methodId: string | number,
    workspaceId: string | number
  ) =>
    apiClient.post(`/workspaces/billing/payment-methods/${methodId}/default/`, {
      workspace_id: workspaceId
    }),

  deleteBillingMethod: (
    methodId: string | number,
    workspaceId: string | number
  ) =>
    apiClient.delete(`/workspaces/billing/payment-methods/${methodId}/`, {
      params: { workspace_id: workspaceId }
    }),

  createBillingPlanCheckout: (payload: Record<string, unknown>) =>
    apiClient.post('/workspaces/billing/plan/checkout/', payload),

  changeBillingPlan: (payload: Record<string, unknown>) =>
    apiClient.post('/workspaces/billing/plan/change/', payload),

  listProviders: () => apiClient.get('/workspaces/payments/providers/'),

  listMethods: (seedId: string | number) =>
    apiClient.get(`/workspaces/payments/workspaces/${seedId}/methods/`),

  createMethod: (seedId: string | number, payload: Record<string, unknown>) =>
    apiClient.post(
      `/workspaces/payments/workspaces/${seedId}/methods/`,
      payload
    ),

  updateMethod: (
    seedId: string | number,
    methodId: string | number,
    payload: Record<string, unknown>
  ) =>
    apiClient.patch(
      `/workspaces/payments/workspaces/${seedId}/methods/${methodId}/`,
      payload
    ),

  setPrimaryMethod: (seedId: string | number, methodId: string | number) =>
    apiClient.post(
      `/workspaces/payments/workspaces/${seedId}/methods/${methodId}/set-primary/`
    ),

  deleteMethod: (seedId: string | number, methodId: string | number) =>
    apiClient.delete(
      `/workspaces/payments/workspaces/${seedId}/methods/${methodId}/`
    ),

  listMethodPlans: (
    seedId: string | number,
    methodId: string | number,
    params?: Record<string, unknown>
  ) =>
    apiClient.get(
      `/workspaces/payments/workspaces/${seedId}/methods/${methodId}/plans/`,
      params ? { params } : undefined
    ),

  createMethodPlan: (
    seedId: string | number,
    methodId: string | number,
    payload: Record<string, unknown>
  ) =>
    apiClient.post(
      `/workspaces/payments/workspaces/${seedId}/methods/${methodId}/plans/`,
      payload
    ),

  updateMethodPlan: (
    seedId: string | number,
    methodId: string | number,
    planId: string | number,
    payload: Record<string, unknown>
  ) =>
    apiClient.patch(
      `/workspaces/payments/workspaces/${seedId}/methods/${methodId}/plans/${planId}/`,
      payload
    ),

  deleteMethodPlan: (
    seedId: string | number,
    methodId: string | number,
    planId: string | number
  ) =>
    apiClient.delete(
      `/workspaces/payments/workspaces/${seedId}/methods/${methodId}/plans/${planId}/`
    ),

  authorizeMethod: (
    seedId: string | number,
    methodId: string | number,
    payload: Record<string, unknown>
  ) =>
    apiClient.post(
      `/workspaces/payments/workspaces/${seedId}/methods/${methodId}/authorize/`,
      payload
    ),

  testMethodConnection: (seedId: string | number, methodId: string | number) =>
    apiClient.post(
      `/workspaces/payments/workspaces/${seedId}/methods/${methodId}/test-connection/`,
      {}
    ),

  upsertMethodWebhook: (
    seedId: string | number,
    methodId: string | number,
    payload: Record<string, unknown>
  ) =>
    apiClient.post(
      `/workspaces/payments/workspaces/${seedId}/methods/${methodId}/webhooks/`,
      payload
    ),

  listPublicMethods: (
    seedId: string | number,
    params?: Record<string, unknown>
  ) =>
    apiClient.get(
      `/workspaces/payments/public/workspaces/${seedId}/`,
      params ? { params } : undefined
    ),

  createDonationCheckout: (payload: Record<string, unknown>) =>
    apiClient.post('/sponsorship/donations/donate/', payload),

  createSponsorCheckout: (payload: Record<string, unknown>) =>
    apiClient.post('/sponsorship/sponsor/', payload),

  // Public, PII-safe list of a recipient's OPEN needs for the checkout
  // need-selector (anonymous or in-app donor). Backend: RecipientPublicNeedsView.
  listPublicRecipientNeeds: (recipientId: string) =>
    apiClient.get(`/sponsorship/recipients/${recipientId}/needs/public/`),

  createCampaignCheckout: (payload: Record<string, unknown>) =>
    apiClient.post('/sponsorship/donations/campaign/', payload),

  createEventCheckout: (payload: Record<string, unknown>) =>
    apiClient.post('/events/checkout/', payload),

  createProjectCheckout: (payload: Record<string, unknown>) =>
    apiClient.post('/sponsorship/sponsor/project/checkout/', payload)
};
