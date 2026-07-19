import type { BooleanLike } from '../../types/auth';

export const resolveBooleanFlag = (value: BooleanLike): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    if (normalized === '') return null;
    const numeric = Number(normalized);
    if (Number.isFinite(numeric)) return numeric !== 0;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value !== 0;
  }
  return null;
};
