import { useMemo } from 'react';

export const useStoreProviderValue = ({
  state,
  getUser,
  getStore,
  createStore
}: {
  state: any;
  getUser: any;
  getStore: any;
  createStore: any;
}) =>
  useMemo(
    () => ({
      ...state,
      isLoading: state.loading,
      getUser,
      getStore,
      createStore
    }),
    [state, getUser, getStore, createStore]
  );
