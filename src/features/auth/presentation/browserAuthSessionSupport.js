import {
  clearAuthSessionStorage,
  readAccessToken,
  readPostLoginRedirect,
  readPreauthToken,
  readRefreshToken,
  readStoredUser,
  readStoredUserSummary,
  removeAccessToken,
  removePostLoginRedirect,
  removePreauthToken,
  removeRefreshToken,
  writeAccessToken,
  writePostLoginRedirect,
  writePreauthToken,
  writeRefreshToken,
  writeStoredUser,
  writeStoredUserSummary
} from '../../../infrastructure/session/browserAuthStore';

export const clearViewerAuthSessionStorage = () => clearAuthSessionStorage();

export const readViewerAccessToken = () => readAccessToken();

export const readViewerPostLoginRedirect = () => readPostLoginRedirect();

export const readViewerPreauthToken = () => readPreauthToken();

export const readViewerRefreshToken = () => readRefreshToken();

export const readViewerStoredUser = () => readStoredUser();

export const readViewerStoredUserSummary = () => readStoredUserSummary();

export const removeViewerAccessToken = () => removeAccessToken();

export const removeViewerPostLoginRedirect = () => removePostLoginRedirect();

export const removeViewerPreauthToken = () => removePreauthToken();

export const removeViewerRefreshToken = () => removeRefreshToken();

export const writeViewerAccessToken = (token) => writeAccessToken(token);

export const writeViewerPostLoginRedirect = (redirect) =>
  writePostLoginRedirect(redirect);

export const writeViewerPreauthToken = (token) => writePreauthToken(token);

export const writeViewerRefreshToken = (token) => writeRefreshToken(token);

export const writeViewerStoredUser = (nextUser) => writeStoredUser(nextUser);

export const writeViewerStoredUserSummary = (summary) =>
  writeStoredUserSummary(summary);
