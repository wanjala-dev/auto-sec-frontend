// @ts-nocheck
import React, { useContext, useReducer } from 'react';

import LoginAuthReducer from '../../../reducer/auth_reducer';
import { useFeatureFlags } from '../../feature-flags/presentation/FeatureFlagsContext';
import { useLoginAuthPresentationSlices } from './useLoginAuthPresentationSlices';
import { useLoginAuthProviderSupport } from './useLoginAuthProviderSupport';
import { useLoginAuthProviderValue } from './useLoginAuthProviderValue';

type LoginAuthProviderProps = {
  children: React.ReactNode;
};

const LoginAuthContext = React.createContext(null as any);

const LoginAuthProvider = ({ children }: LoginAuthProviderProps) => {
  const [state, dispatch] = useReducer(LoginAuthReducer, {});
  const { notifySummaryUpdated } = useFeatureFlags();

  const support = useLoginAuthProviderSupport({
    dispatch
  });

  const { session, recovery } = useLoginAuthPresentationSlices({
    state,
    notifySummaryUpdated,
    support
  });

  const value = useLoginAuthProviderValue({
    state,
    support,
    session,
    recovery
  });

  return (
    <LoginAuthContext.Provider value={value}>
      {children}
    </LoginAuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(LoginAuthContext);
  if (context === null) {
    throw new Error('useAuthContext must be used within a LoginAuthProvider');
  }
  return context;
};

export { LoginAuthContext, LoginAuthProvider };
