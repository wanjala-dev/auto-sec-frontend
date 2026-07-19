// @ts-nocheck
import React, { createContext, useContext, useReducer } from 'react';

import { ErrorToastContext } from '../../error-toast/presentation/ErrorToastContext';
import seedReducer from '../../../reducer/seedReducer';
import { seedInitialState } from './seedContextConfig';
import { useSeedProviderComposition } from './useSeedProviderComposition';

type SeedProviderProps = {
  children: React.ReactNode;
};

const SeedContext = createContext(null as any);

const SeedProvider = ({ children }: SeedProviderProps) => {
  const [state, dispatch] = useReducer(seedReducer, seedInitialState);
  const { addToast, notifyError, notifySuccess } =
    useContext(ErrorToastContext);
  const contextValue = useSeedProviderComposition({
    state,
    dispatch,
    addToast,
    notifySuccess,
    notifyError
  });

  return (
    <SeedContext.Provider value={contextValue}>{children}</SeedContext.Provider>
  );
};

export const useSeedContext = () => {
  const context = useContext(SeedContext);
  if (context === null) {
    throw new Error('useSeedContext must be used within a SeedProvider');
  }
  return context;
};

export { SeedContext, SeedProvider };
