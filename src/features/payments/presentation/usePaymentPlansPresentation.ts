import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  createSeedPaymentMethodPlan,
  listPaymentMethodPlans,
  listPublicPaymentMethods,
  removeSeedPaymentMethodPlan,
  updateSeedPaymentMethodPlan
} from '../../../application/payments/paymentsService';

export const usePaymentPlansPresentation = ({
  dispatch,
  actions
}: {
  dispatch: any;
  actions: any;
}) => {
  const fetchPaymentMethodPlans = useCallback(
    async (seedId, methodId, params = {}) => {
      if (!seedId || !methodId) {
        throw new Error('Seed and method identifiers are required.');
      }
      dispatch({
        type: actions.PAYMENTS_METHOD_PLANS_REQUEST,
        payload: { methodId }
      });
      try {
        const plans = await listPaymentMethodPlans(seedId, methodId, params);
        dispatch({
          type: actions.PAYMENTS_METHOD_PLANS_SUCCESS,
          payload: { methodId, plans }
        });
        return plans;
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to load payment plans.';
        dispatch({
          type: actions.PAYMENTS_METHOD_PLANS_FAILURE,
          payload: { methodId, error: message }
        });
        toast.error(message);
        throw error;
      }
    },
    [
      actions.PAYMENTS_METHOD_PLANS_FAILURE,
      actions.PAYMENTS_METHOD_PLANS_REQUEST,
      actions.PAYMENTS_METHOD_PLANS_SUCCESS,
      dispatch
    ]
  );

  const createPaymentMethodPlan = useCallback(
    async (seedId, methodId, payload) => {
      if (!seedId || !methodId) {
        throw new Error('Seed and method identifiers are required.');
      }
      dispatch({
        type: actions.PAYMENTS_METHOD_PLAN_CREATE_REQUEST,
        payload: { methodId }
      });
      try {
        const plan = await createSeedPaymentMethodPlan(
          seedId,
          methodId,
          payload
        );
        dispatch({
          type: actions.PAYMENTS_METHOD_PLAN_CREATE_SUCCESS,
          payload: { methodId, plan }
        });
        toast.success('Payment plan added.');
        return plan;
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to create payment plan.';
        dispatch({
          type: actions.PAYMENTS_METHOD_PLAN_CREATE_FAILURE,
          payload: { methodId, error: message }
        });
        toast.error(message);
        throw error;
      }
    },
    [
      actions.PAYMENTS_METHOD_PLAN_CREATE_FAILURE,
      actions.PAYMENTS_METHOD_PLAN_CREATE_REQUEST,
      actions.PAYMENTS_METHOD_PLAN_CREATE_SUCCESS,
      dispatch
    ]
  );

  const updatePaymentMethodPlan = useCallback(
    async (seedId, methodId, planId, payload) => {
      if (!seedId || !methodId || !planId) {
        throw new Error('Seed, method, and plan identifiers are required.');
      }
      dispatch({
        type: actions.PAYMENTS_METHOD_PLAN_UPDATE_REQUEST,
        payload: { methodId, planId }
      });
      try {
        const plan = await updateSeedPaymentMethodPlan(
          seedId,
          methodId,
          planId,
          payload
        );
        dispatch({
          type: actions.PAYMENTS_METHOD_PLAN_UPDATE_SUCCESS,
          payload: { methodId, plan }
        });
        toast.success('Payment plan updated.');
        return plan;
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to update payment plan.';
        dispatch({
          type: actions.PAYMENTS_METHOD_PLAN_UPDATE_FAILURE,
          payload: { methodId, planId, error: message }
        });
        toast.error(message);
        throw error;
      }
    },
    [
      actions.PAYMENTS_METHOD_PLAN_UPDATE_FAILURE,
      actions.PAYMENTS_METHOD_PLAN_UPDATE_REQUEST,
      actions.PAYMENTS_METHOD_PLAN_UPDATE_SUCCESS,
      dispatch
    ]
  );

  const deletePaymentMethodPlan = useCallback(
    async (seedId, methodId, planId) => {
      if (!seedId || !methodId || !planId) {
        throw new Error('Seed, method, and plan identifiers are required.');
      }
      dispatch({
        type: actions.PAYMENTS_METHOD_PLAN_DELETE_REQUEST,
        payload: { methodId, planId }
      });
      try {
        await removeSeedPaymentMethodPlan(seedId, methodId, planId);
        dispatch({
          type: actions.PAYMENTS_METHOD_PLAN_DELETE_SUCCESS,
          payload: { methodId, planId }
        });
        toast.success('Payment plan removed.');
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to delete payment plan.';
        dispatch({
          type: actions.PAYMENTS_METHOD_PLAN_DELETE_FAILURE,
          payload: { methodId, planId, error: message }
        });
        toast.error(message);
        throw error;
      }
    },
    [
      actions.PAYMENTS_METHOD_PLAN_DELETE_FAILURE,
      actions.PAYMENTS_METHOD_PLAN_DELETE_REQUEST,
      actions.PAYMENTS_METHOD_PLAN_DELETE_SUCCESS,
      dispatch
    ]
  );

  const fetchPublicPaymentMethods = useCallback(
    async (seedId, context, childId) => {
      if (!seedId) {
        return [];
      }
      let resolvedContext = context;
      let resolvedRecipientId = childId;
      if (context && typeof context === 'object' && !Array.isArray(context)) {
        resolvedContext = context;
        resolvedRecipientId = childId;
      }
      return listPublicPaymentMethods(
        seedId,
        resolvedContext,
        resolvedRecipientId
      );
    },
    []
  );

  return {
    fetchPaymentMethodPlans,
    createPaymentMethodPlan,
    updatePaymentMethodPlan,
    deletePaymentMethodPlan,
    fetchPublicPaymentMethods
  };
};
