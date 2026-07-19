import { useCallback, useMemo } from 'react';
import {
  createUserStore,
  fetchPublicUserProfile,
  fetchUserStore
} from '../../../application/userProfile/userProfileService';
import {
  CREATE_STORE,
  GET_STORE,
  GET_USER,
  USER_LOADING
} from '../../../types/storeTypes';

export const useStorePresentation = ({
  dispatch,
  addToast
}: {
  dispatch: any;
  addToast: any;
}) => {
  const getUser = useCallback(
    async (id) => {
      dispatch({
        type: USER_LOADING
      });

      try {
        const user = await fetchPublicUserProfile(id);
        dispatch({
          type: GET_USER,
          payload: user
        });
        return user;
      } catch (error) {
        addToast({
          message:
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            error?.message ||
            'Unable to load this user right now.',
          error: true
        });
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const getStore = useCallback(
    async (userId) => {
      dispatch({
        type: USER_LOADING
      });

      try {
        const store = await fetchUserStore(userId);
        dispatch({
          type: GET_STORE,
          payload: store
        });
        return store;
      } catch (error) {
        addToast({
          message:
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            error?.message ||
            'Unable to load store details right now.',
          error: true
        });
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const createStore = useCallback(
    async (dataForm) => {
      dispatch({
        type: USER_LOADING
      });

      try {
        const store = await createUserStore(dataForm);
        dispatch({
          type: CREATE_STORE,
          payload: store
        });
        return store;
      } catch (error) {
        if (error.response === undefined) {
          addToast({
            message: 'Unknown Error - check your network connection',
            error: true
          });
        } else if (
          error.response.status === 500 ||
          error.response.status === 404
        ) {
          addToast({ message: 'Server Error !', error: true });
        } else {
          addToast({
            message:
              error?.response?.data?.name ||
              error?.response?.data?.detail ||
              'Unable to create store right now.',
            error: true
          });
        }
        throw error;
      }
    },
    [addToast, dispatch]
  );

  return useMemo(
    () => ({ getUser, getStore, createStore }),
    [getUser, getStore, createStore]
  );
};
