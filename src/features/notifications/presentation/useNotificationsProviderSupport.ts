import { useEffect, useMemo, useRef } from 'react';
import { readViewerSessionSnapshot } from '../../../features/auth/presentation/useViewerSession';

const resolveUserIdFromStorage = () => {
  try {
    const { storedUser: parsed } = readViewerSessionSnapshot();
    if (!parsed) return null;
    return parsed?.pk || parsed?.id || null;
  } catch (error) {
    console.warn('Failed to parse stored user for notifications:', error);
    return null;
  }
};

export const useNotificationsProviderSupport = ({
  state,
  user
}: {
  state: any;
  user: any;
}) => {
  const filtersRef = useRef(state.filters);
  const feedRequestRef = useRef({ key: null, promise: null });
  const unreadRequestRef = useRef({ key: null, promise: null });
  const cooldownUntilRef = useRef({ feed: 0, unread: 0 });
  const cooldownToastRef = useRef({ feed: false, unread: false });

  useEffect(() => {
    filtersRef.current = state.filters;
  }, [state.filters]);

  const resolvedUserId = useMemo(
    () => user?.user?.pk || user?.pk || resolveUserIdFromStorage(),
    [user]
  );

  return {
    filtersRef,
    feedRequestRef,
    unreadRequestRef,
    cooldownUntilRef,
    cooldownToastRef,
    resolvedUserId
  };
};
