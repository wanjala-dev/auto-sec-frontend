import { useAuthProviderValue } from './useAuthProviderValue';

export const useAuthProviderComposition = ({ user, dispatch }) =>
  useAuthProviderValue({
    user,
    dispatch
  });
