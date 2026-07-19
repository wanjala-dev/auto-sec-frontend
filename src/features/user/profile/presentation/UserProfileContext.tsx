// @ts-nocheck
import React, { createContext, useContext, useReducer } from 'react';

import { useErrorToastContext } from '../../../error-toast/presentation/ErrorToastContext';
import userReducer from '../../../../reducer/userProfileReducer';
import { useFeatureFlags } from '../../../feature-flags/presentation/FeatureFlagsContext';
import { userProfileInitialState } from './userProfileContextConfig';
import { useUserProfileProviderComposition } from './useUserProfileProviderComposition';

type UserProfileProviderProps = {
  children: React.ReactNode;
};

const UserProfileContext = createContext(null as any);

const UserProfileProvider = ({ children }: UserProfileProviderProps) => {
  const [state, dispatch] = useReducer(userReducer, userProfileInitialState);
  const { fetchEvaluatedFlags, notifySummaryUpdated } = useFeatureFlags();
  const { addToast } = useErrorToastContext();

  const contextValue = useUserProfileProviderComposition({
    state,
    dispatch,
    addToast,
    fetchEvaluatedFlags,
    notifySummaryUpdated
  });

  return (
    <UserProfileContext.Provider value={contextValue}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfileContext = () => {
  const context = useContext(UserProfileContext);
  if (context === null) {
    throw new Error(
      'useUserProfileContext must be used within a UserProfileProvider'
    );
  }
  return context;
};

export { UserProfileContext, UserProfileProvider };
