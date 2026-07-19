import React, { useReducer } from 'react';

import LoginAuthReducer from '../../../reducer/auth_reducer';
import { authInitialState } from './authContextConfig';
import { useAuthProviderComposition } from './useAuthProviderComposition';

type AuthProviderProps = {
  children: React.ReactNode;
};

const AuthStateContext = React.createContext(null as any);
const AuthDispatchContext = React.createContext(null as any);

export function useAuthState() {
  const context = React.useContext(AuthStateContext);
  if (context === null) {
    throw new Error('useAuthState must be used within a AuthProvider');
  }

  return context;
}

export function useAuthDispatch() {
  const context = React.useContext(AuthDispatchContext);
  if (context === null) {
    throw new Error('useAuthDispatch must be used within a AuthProvider');
  }

  return context;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, dispatch] = useReducer(LoginAuthReducer, authInitialState);
  const { stateValue, dispatchValue } = useAuthProviderComposition({
    user,
    dispatch
  });

  return (
    <AuthStateContext.Provider value={stateValue}>
      <AuthDispatchContext.Provider value={dispatchValue}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  );
};

export { AuthDispatchContext, AuthStateContext };
