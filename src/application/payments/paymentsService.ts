import {
  filterEmptyPaymentEntries,
  normalizePaymentList
} from '../../domain/payments/paymentCollections';
import { paymentsApi } from '../../infrastructure/payments/paymentsApi';

export const listPaymentProviders = async () => {
  const response = await paymentsApi.listProviders();
  return normalizePaymentList(response?.data);
};

export const getBillingOverview = async (workspaceId: string | number) => {
  const response = await paymentsApi.getBillingOverview(workspaceId);
  return response?.data ?? null;
};

export const listBillingMethods = async (workspaceId: string | number) => {
  const response = await paymentsApi.listBillingMethods(workspaceId);
  return response?.data ?? null;
};

export const listBillingPlans = async (
  workspaceId?: string | number | null
) => {
  const response = await paymentsApi.listBillingPlans(workspaceId);
  return response?.data ?? null;
};

export const getBillingPlanPreview = async (
  workspaceId: string | number,
  planId: string | number
) => {
  const response = await paymentsApi.getBillingPlanPreview(workspaceId, planId);
  return response?.data ?? null;
};

export const createBillingSetupIntent = async (
  workspaceId: string | number
) => {
  const response = await paymentsApi.createBillingSetupIntent(workspaceId);
  return response?.data ?? null;
};

export const setBillingDefaultMethod = async (
  methodId: string | number,
  workspaceId: string | number
) => {
  const response = await paymentsApi.setBillingDefaultMethod(
    methodId,
    workspaceId
  );
  return response?.data ?? null;
};

export const deleteBillingMethod = (
  methodId: string | number,
  workspaceId: string | number
) => paymentsApi.deleteBillingMethod(methodId, workspaceId);

export const createBillingPlanCheckout = async (
  payload: Record<string, unknown>
) => {
  const response = await paymentsApi.createBillingPlanCheckout(
    filterEmptyPaymentEntries(payload)
  );
  return response?.data ?? null;
};

export const changeBillingPlan = async (payload: Record<string, unknown>) => {
  const response = await paymentsApi.changeBillingPlan(
    filterEmptyPaymentEntries(payload)
  );
  return response?.data ?? null;
};

export const listSeedPaymentMethods = async (
  seedId: string | number | null | undefined
) => {
  if (!seedId) {
    return [];
  }

  const response = await paymentsApi.listMethods(seedId);
  return normalizePaymentList(response?.data);
};

export const createSeedPaymentMethod = async (
  seedId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await paymentsApi.createMethod(seedId, payload);
  return response?.data;
};

export const updateSeedPaymentMethod = async (
  seedId: string | number,
  methodId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await paymentsApi.updateMethod(seedId, methodId, payload);
  return response?.data;
};

export const setSeedPrimaryPaymentMethod = async (
  seedId: string | number,
  methodId: string | number
) => {
  const response = await paymentsApi.setPrimaryMethod(seedId, methodId);
  return response?.data;
};

export const removeSeedPaymentMethod = (
  seedId: string | number,
  methodId: string | number
) => paymentsApi.deleteMethod(seedId, methodId);

export const listPaymentMethodPlans = async (
  seedId: string | number,
  methodId: string | number,
  params: Record<string, unknown> = {}
) => {
  const response = await paymentsApi.listMethodPlans(
    seedId,
    methodId,
    filterEmptyPaymentEntries(params)
  );

  return normalizePaymentList(response?.data);
};

export const createSeedPaymentMethodPlan = async (
  seedId: string | number,
  methodId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await paymentsApi.createMethodPlan(
    seedId,
    methodId,
    filterEmptyPaymentEntries(payload)
  );

  return response?.data;
};

export const updateSeedPaymentMethodPlan = async (
  seedId: string | number,
  methodId: string | number,
  planId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await paymentsApi.updateMethodPlan(
    seedId,
    methodId,
    planId,
    filterEmptyPaymentEntries(payload)
  );

  return response?.data;
};

export const removeSeedPaymentMethodPlan = (
  seedId: string | number,
  methodId: string | number,
  planId: string | number
) => paymentsApi.deleteMethodPlan(seedId, methodId, planId);

export const authorizeSeedPaymentMethod = async (
  seedId: string | number,
  methodId: string | number,
  options: Record<string, unknown> = {}
) => {
  const response = await paymentsApi.authorizeMethod(
    seedId,
    methodId,
    filterEmptyPaymentEntries(options)
  );

  return response?.data;
};

export const testSeedPaymentMethodConnection = async (
  seedId: string | number,
  methodId: string | number
) => {
  const response = await paymentsApi.testMethodConnection(seedId, methodId);
  return response?.data;
};

export const upsertSeedPaymentMethodWebhook = async (
  seedId: string | number,
  methodId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await paymentsApi.upsertMethodWebhook(
    seedId,
    methodId,
    filterEmptyPaymentEntries(payload)
  );
  return response?.data;
};

export const listPublicPaymentMethods = async (
  seedId: string | number | null | undefined,
  context: any,
  childId?: string | number | null
) => {
  if (!seedId) {
    return [];
  }

  let resolvedContext = context;
  let resolvedRecipientId = childId;
  if (context && typeof context === 'object' && !Array.isArray(context)) {
    resolvedContext = context.context || context.ctx || '';
    resolvedRecipientId =
      context.recipientId ||
      context.recipient_id ||
      context.childId ||
      context.child_id ||
      '';
  }

  const params = filterEmptyPaymentEntries({
    context: resolvedContext,
    recipient_id: resolvedRecipientId
  });

  const response = await paymentsApi.listPublicMethods(seedId, params);
  return normalizePaymentList(response?.data);
};

export const createDonationCheckout = async (
  payload: Record<string, unknown>
) => {
  const response = await paymentsApi.createDonationCheckout(
    filterEmptyPaymentEntries(payload)
  );
  return response?.data ?? null;
};

export const createSponsorCheckout = async (
  payload: Record<string, unknown>
) => {
  const response = await paymentsApi.createSponsorCheckout(
    filterEmptyPaymentEntries(payload)
  );
  return response?.data ?? null;
};

export const listPublicRecipientNeeds = async (recipientId: string) => {
  const response = await paymentsApi.listPublicRecipientNeeds(recipientId);
  return Array.isArray(response?.data) ? response.data : [];
};

export const createCampaignCheckout = async (
  payload: Record<string, unknown>
) => {
  const response = await paymentsApi.createCampaignCheckout(
    filterEmptyPaymentEntries(payload)
  );
  return response?.data ?? null;
};

export const createEventCheckout = async (payload: Record<string, unknown>) => {
  const response = await paymentsApi.createEventCheckout(
    filterEmptyPaymentEntries(payload)
  );
  return response?.data ?? null;
};

export const createProjectCheckout = async (
  payload: Record<string, unknown>
) => {
  const response = await paymentsApi.createProjectCheckout(
    filterEmptyPaymentEntries(payload)
  );
  return response?.data ?? null;
};
