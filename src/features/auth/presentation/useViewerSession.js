import {
  readViewerStoredUser,
  readViewerStoredUserSummary,
  writeViewerStoredUser
} from './browserAuthSessionSupport';
import { resolveViewerSessionSnapshot } from './viewerSessionModel';

export const readViewerSessionSnapshot = () => {
  return resolveViewerSessionSnapshot(
    readViewerStoredUser() || null,
    readViewerStoredUserSummary() || null
  );
};

export const useViewerSession = () => {
  return readViewerSessionSnapshot();
};

export { writeViewerStoredUser };
