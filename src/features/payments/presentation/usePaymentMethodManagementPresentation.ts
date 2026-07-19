import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  authorizeSeedPaymentMethod,
  createSeedPaymentMethod,
  listPaymentProviders,
  listSeedPaymentMethods,
  removeSeedPaymentMethod,
  setSeedPrimaryPaymentMethod,
  testSeedPaymentMethodConnection,
  updateSeedPaymentMethod,
  upsertSeedPaymentMethodWebhook
} from '../../../application/payments/paymentsService';

export const usePaymentMethodManagementPresentation = ({
  dispatch,
  actions
}: {
  dispatch: any;
  actions: any;
}) => {
  const fetchPaymentProviders = useCallback(async () => {
    dispatch({ type: actions.PAYMENTS_PROVIDERS_REQUEST });
    try {
      const providers = await listPaymentProviders();
      dispatch({
        type: actions.PAYMENTS_PROVIDERS_SUCCESS,
        payload: providers
      });
      return providers;
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Unable to load payment providers.';
      dispatch({
        type: actions.PAYMENTS_PROVIDERS_FAILURE,
        payload: message
      });
      toast.error(message);
      throw error;
    }
  }, [
    actions.PAYMENTS_PROVIDERS_FAILURE,
    actions.PAYMENTS_PROVIDERS_REQUEST,
    actions.PAYMENTS_PROVIDERS_SUCCESS,
    dispatch
  ]);

  const fetchSeedPaymentMethods = useCallback(
    async (seedId) => {
      if (!seedId) {
        return [];
      }
      dispatch({
        type: actions.PAYMENTS_METHODS_REQUEST,
        payload: { seedId }
      });
      try {
        const methods = await listSeedPaymentMethods(seedId);
        dispatch({
          type: actions.PAYMENTS_METHODS_SUCCESS,
          payload: { seedId, methods }
        });
        return methods;
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to load payment methods.';
        dispatch({
          type: actions.PAYMENTS_METHODS_FAILURE,
          payload: { seedId, error: message }
        });
        toast.error(message);
        throw error;
      }
    },
    [
      actions.PAYMENTS_METHODS_FAILURE,
      actions.PAYMENTS_METHODS_REQUEST,
      actions.PAYMENTS_METHODS_SUCCESS,
      dispatch
    ]
  );

  const createPaymentMethod = useCallback(
    async (seedId, payload) => {
      if (!seedId) {
        throw new Error('Seed identifier is required.');
      }
      dispatch({
        type: actions.PAYMENTS_CREATE_METHOD_REQUEST,
        payload: { seedId }
      });
      try {
        const method = await createSeedPaymentMethod(seedId, payload);
        dispatch({
          type: actions.PAYMENTS_CREATE_METHOD_SUCCESS,
          payload: { seedId, method }
        });
        toast.success('Payment method added.');
        return method;
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to create payment method.';
        dispatch({
          type: actions.PAYMENTS_CREATE_METHOD_FAILURE,
          payload: { seedId, error: message }
        });
        toast.error(message);
        throw error;
      }
    },
    [
      actions.PAYMENTS_CREATE_METHOD_FAILURE,
      actions.PAYMENTS_CREATE_METHOD_REQUEST,
      actions.PAYMENTS_CREATE_METHOD_SUCCESS,
      dispatch
    ]
  );

  const updatePaymentMethod = useCallback(
    async (seedId, methodId, payload) => {
      if (!seedId || !methodId) {
        throw new Error('Seed and method identifiers are required.');
      }
      dispatch({
        type: actions.PAYMENTS_UPDATE_METHOD_REQUEST,
        payload: { seedId, methodId }
      });
      try {
        const method = await updateSeedPaymentMethod(seedId, methodId, payload);
        dispatch({
          type: actions.PAYMENTS_UPDATE_METHOD_SUCCESS,
          payload: { seedId, method }
        });
        toast.success('Payment method updated.');
        return method;
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to update payment method.';
        dispatch({
          type: actions.PAYMENTS_UPDATE_METHOD_FAILURE,
          payload: { seedId, methodId, error: message }
        });
        toast.error(message);
        throw error;
      }
    },
    [
      actions.PAYMENTS_UPDATE_METHOD_FAILURE,
      actions.PAYMENTS_UPDATE_METHOD_REQUEST,
      actions.PAYMENTS_UPDATE_METHOD_SUCCESS,
      dispatch
    ]
  );

  const setPrimaryPaymentMethod = useCallback(
    async (seedId, methodId) => {
      if (!seedId || !methodId) {
        throw new Error('Seed and method identifiers are required.');
      }
      dispatch({
        type: actions.PAYMENTS_SET_PRIMARY_REQUEST,
        payload: { seedId }
      });
      try {
        const method = await setSeedPrimaryPaymentMethod(seedId, methodId);
        dispatch({
          type: actions.PAYMENTS_SET_PRIMARY_SUCCESS,
          payload: { seedId, method }
        });
        toast.success('Default payment method updated.');
        return method;
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to set default payment method.';
        dispatch({
          type: actions.PAYMENTS_SET_PRIMARY_FAILURE,
          payload: { seedId, error: message }
        });
        toast.error(message);
        throw error;
      }
    },
    [
      actions.PAYMENTS_SET_PRIMARY_FAILURE,
      actions.PAYMENTS_SET_PRIMARY_REQUEST,
      actions.PAYMENTS_SET_PRIMARY_SUCCESS,
      dispatch
    ]
  );

  const deletePaymentMethod = useCallback(
    async (seedId, methodId) => {
      if (!seedId || !methodId) {
        throw new Error('Seed and method identifiers are required.');
      }
      dispatch({
        type: actions.PAYMENTS_DELETE_METHOD_REQUEST,
        payload: { seedId, methodId }
      });
      try {
        await removeSeedPaymentMethod(seedId, methodId);
        dispatch({
          type: actions.PAYMENTS_DELETE_METHOD_SUCCESS,
          payload: { seedId, methodId }
        });
        toast.success('Payment method removed.');
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to remove payment method.';
        dispatch({
          type: actions.PAYMENTS_DELETE_METHOD_FAILURE,
          payload: { seedId, methodId, error: message }
        });
        toast.error(message);
        throw error;
      }
    },
    [
      actions.PAYMENTS_DELETE_METHOD_FAILURE,
      actions.PAYMENTS_DELETE_METHOD_REQUEST,
      actions.PAYMENTS_DELETE_METHOD_SUCCESS,
      dispatch
    ]
  );

  const authorizePaymentMethod = useCallback(
    async (seedId, methodId, options = {}) => {
      if (!seedId || !methodId) {
        throw new Error('Seed and method identifiers are required.');
      }
      dispatch({
        type: actions.PAYMENTS_AUTHORIZE_REQUEST,
        payload: { seedId }
      });
      try {
        const response = await authorizeSeedPaymentMethod(
          seedId,
          methodId,
          options
        );
        dispatch({
          type: actions.PAYMENTS_AUTHORIZE_SUCCESS,
          payload: { seedId, method: response }
        });
        return response;
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          'Authorization failed.';
        dispatch({
          type: actions.PAYMENTS_AUTHORIZE_FAILURE,
          payload: { seedId, error: message }
        });
        toast.error(message);
        throw error;
      }
    },
    [
      actions.PAYMENTS_AUTHORIZE_FAILURE,
      actions.PAYMENTS_AUTHORIZE_REQUEST,
      actions.PAYMENTS_AUTHORIZE_SUCCESS,
      dispatch
    ]
  );

  const testPaymentMethodConnection = useCallback(async (seedId, methodId) => {
    if (!seedId || !methodId) {
      throw new Error('Seed and method identifiers are required.');
    }
    try {
      const result = await testSeedPaymentMethodConnection(seedId, methodId);
      if (result?.ok) {
        toast.success('Connection verified.');
      } else {
        toast.error(result?.error || 'Connection test failed.');
      }
      return result;
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        'Connection test failed.';
      toast.error(message);
      throw error;
    }
  }, []);

  const upsertPaymentMethodWebhook = useCallback(
    async (seedId, methodId, payload = {}) => {
      if (!seedId || !methodId) {
        throw new Error('Seed and method identifiers are required.');
      }
      try {
        const result = await upsertSeedPaymentMethodWebhook(
          seedId,
          methodId,
          payload
        );
        toast.success('Webhook endpoint saved.');
        return result;
      } catch (error) {
        const message =
          error?.response?.data?.error ||
          error?.response?.data?.detail ||
          error?.message ||
          'Failed to save webhook endpoint.';
        toast.error(message);
        throw error;
      }
    },
    []
  );

  const clearPaymentsError = useCallback(
    (payload) => {
      dispatch({ type: actions.PAYMENTS_CLEAR_ERROR, payload });
    },
    [actions.PAYMENTS_CLEAR_ERROR, dispatch]
  );

  return {
    fetchPaymentProviders,
    fetchSeedPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    setPrimaryPaymentMethod,
    deletePaymentMethod,
    authorizePaymentMethod,
    testPaymentMethodConnection,
    upsertPaymentMethodWebhook,
    clearPaymentsError
  };
};
