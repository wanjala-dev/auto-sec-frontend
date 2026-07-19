import { useCallback } from 'react';
import {
  createUserStore,
  fetchUserStore
} from '../../../../application/userProfile/userProfileService';
import {
  CREATE_STORE,
  GET_STORE,
  USER_ERROR,
  USER_LOADING
} from '../../../../types/userProfileTypes';

const buildErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.response?.data?.name ||
  error?.message ||
  fallback;

export const useUserProfileStorePresentation = ({
  dispatch,
  addToast,
  onCreateSuccess
}: {
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
  onCreateSuccess?: ((payload: any) => void) | null;
}) => {
  const getStore = useCallback(
    async (userId) => {
      dispatch({ type: USER_LOADING });

      try {
        const store = await fetchUserStore(userId);
        dispatch({
          type: GET_STORE,
          payload: store
        });
        return store;
      } catch (error) {
        dispatch({ type: USER_ERROR });
        addToast?.({
          message: buildErrorMessage(
            error,
            'Unable to load store details right now.'
          ),
          error: true
        });
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const createStore = useCallback(
    async (dataForm) => {
      dispatch({ type: USER_LOADING });

      try {
        const store = await createUserStore(dataForm);
        dispatch({
          type: CREATE_STORE,
          payload: store
        });
        onCreateSuccess?.(store);
        return store;
      } catch (error) {
        dispatch({ type: USER_ERROR });
        addToast?.({
          message: buildErrorMessage(
            error,
            'Unable to create a store right now.'
          ),
          error: true
        });
        throw error;
      }
    },
    [addToast, dispatch, onCreateSuccess]
  );

  return {
    getStore,
    createStore
  };
};
