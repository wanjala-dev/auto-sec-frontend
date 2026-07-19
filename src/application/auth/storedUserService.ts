import {
  readStoredUser,
  updateStoredUserRecord
} from '../../infrastructure/session/browserAuthStore';

export const readStoredUserSession = <T = any>(): T | null =>
  readStoredUser<T>();

export const updateStoredUserSession = (updates: any): any => {
  try {
    return updateStoredUserRecord(updates);
  } catch (error) {
    console.warn('Unable to persist stored user', error);
    return null;
  }
};
