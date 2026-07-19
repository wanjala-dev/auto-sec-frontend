import { useMemo } from 'react';

export const useAuthProviderValue = ({ user, dispatch }) => {
  const stateValue = useMemo(() => user, [user]);
  const dispatchValue = useMemo(() => dispatch, [dispatch]);

  return {
    stateValue,
    dispatchValue
  };
};
