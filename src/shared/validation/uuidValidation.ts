const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true if the value is a valid UUID v4 format string. */
export const isValidUUID = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  return UUID_PATTERN.test(value.trim());
};
