// @ts-nocheck
import React, { createContext, useContext, useReducer } from 'react';
import PropTypes from 'prop-types';

import { useUserProfileContext } from '../../../features/user/profile/presentation/UserProfileContext';
import {
  notificationsInitialState,
  notificationsReducer
} from './notificationsContextConfig';
import { useNotificationsProviderComposition } from './useNotificationsProviderComposition';

type NotificationsProviderProps = {
  children: React.ReactNode;
};

const NotificationsContext = createContext(null as any);

export const NotificationsProvider = ({
  children
}: NotificationsProviderProps) => {
  const [state, dispatch] = useReducer(
    notificationsReducer,
    notificationsInitialState
  );
  const { user } = useUserProfileContext();
  const value = useNotificationsProviderComposition({
    state,
    dispatch,
    user
  });

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

NotificationsProvider.propTypes = {
  children: PropTypes.node
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationsProvider'
    );
  }
  return context;
};

export default NotificationsContext;
