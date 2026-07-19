import { normalizeInviteCode } from '../domain/inviteCode';
import {
  clearPendingInviteRecord,
  readPendingInviteRecord,
  writePendingInviteRecord
} from '../../../infrastructure/session/browserInviteStore';

export const readPendingInvite = () => readPendingInviteRecord();

export const writePendingInvite = (updates: Record<string, unknown> = {}) =>
  writePendingInviteRecord(updates);

export const clearPendingInvite = () => clearPendingInviteRecord();

export { normalizeInviteCode };
