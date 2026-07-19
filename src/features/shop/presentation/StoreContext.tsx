// @ts-nocheck
import React, { createContext, useContext, useReducer } from 'react';

import { useErrorToast } from '../../../hooks/UseErrorToastHook';
import storeReducer from '../../../reducer/storeReducer';
import { useStorePresentation } from './useStorePresentation';
import { useStoreProviderValue } from './useStoreProviderValue';

type StoreProviderProps = {
  children: React.ReactNode;
};

const StoreContext = createContext(null as any);

const initialState = {
  user: [],
  store: [],
  loading: true
};

const StoreProvider = ({ children }: StoreProviderProps) => {
  const [state, dispatch] = useReducer(storeReducer, initialState);

  const { addToast } = useErrorToast(4000);

  const { getUser, getStore, createStore } = useStorePresentation({
    dispatch,
    addToast
  });

  const contextValue = useStoreProviderValue({
    state,
    getUser,
    getStore,
    createStore
  });

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStoreContext = () => {
  const context = useContext(StoreContext);
  if (context === null) {
    throw new Error('useStoreContext must be used within a StoreProvider');
  }
  return context;
};

export { StoreContext, StoreProvider };
