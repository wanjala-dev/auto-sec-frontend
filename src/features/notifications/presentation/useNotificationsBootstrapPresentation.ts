import { useEffect } from 'react';

const isAuthRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return (
    path.startsWith('/identity/') ||
    path.startsWith('/onboard') ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/contributor-onboard')
  );
};

export const useNotificationsBootstrapPresentation = ({
  resolvedUserId,
  fetchFeed,
  resetForMissingUser
}: {
  resolvedUserId: any;
  fetchFeed: any;
  resetForMissingUser: any;
}) => {
  useEffect(() => {
    if (!resolvedUserId || isAuthRoute()) {
      resetForMissingUser();
      return;
    }
    fetchFeed({}, { reset: true, replace: true });
  }, [fetchFeed, resetForMissingUser, resolvedUserId]);
};
