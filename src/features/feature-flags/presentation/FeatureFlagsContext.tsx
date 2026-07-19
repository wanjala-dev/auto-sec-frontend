import React, { createContext, useContext, useReducer } from 'react';
import PropTypes from 'prop-types';

import featureFlagsReducer from '../../../reducer/featureFlagsReducer';
import { featureFlagsInitialState } from './featureFlagsContextConfig';
import { useFeatureFlagsProviderComposition } from './useFeatureFlagsProviderComposition';

type FeatureFlagsProviderProps = {
  children: React.ReactNode;
};

const FeatureFlagsContext = createContext(null as any);

export const FeatureFlagsProvider = ({
  children
}: FeatureFlagsProviderProps) => {
  const [state, dispatch] = useReducer(
    featureFlagsReducer,
    featureFlagsInitialState
  );

  const value = useFeatureFlagsProviderComposition({
    state,
    dispatch
  });

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (context === null) {
    throw new Error(
      'useFeatureFlags must be used within a FeatureFlagsProvider'
    );
  }
  return context;
};

FeatureFlagsProvider.propTypes = {
  children: PropTypes.node
};
