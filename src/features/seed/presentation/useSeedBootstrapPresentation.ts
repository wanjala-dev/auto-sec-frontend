import { useEffect } from 'react';

export const useSeedBootstrapPresentation = ({
  state,
  support,
  getUserSeed
}: {
  state: any;
  support: any;
  getUserSeed: any;
}) => {
  useEffect(() => {
    if (support.userSeedsPrefetchRef.current) return;
    if (Array.isArray(state?.userseed) && state.userseed.length) return;
    const storedUserId = support.resolveUserId();
    if (!storedUserId) return;
    support.userSeedsPrefetchRef.current = true;
    getUserSeed(storedUserId).catch(() => {
      support.userSeedsPrefetchRef.current = false;
    });
  }, [getUserSeed, state?.userseed, support]);
};
