/**
 * Role/identity display mapping for the Auto-Sec HUD.
 *
 * This is a security product with a Linux-operator mental model, so the
 * top-privilege "admin" identity is surfaced as **root** everywhere it's shown
 * on the dashboard (operator badge, member lists, role columns). Anything that
 * normalizes to an admin-tier role maps to "root"; every other role passes
 * through unchanged.
 */

const ADMIN_ALIASES = new Set([
  'admin',
  'administrator',
  'workspace_admin',
  'workspace-admin',
  'org_admin',
  'org-admin'
]);

/**
 * Map a raw role/label to its dashboard display form. Admin-tier → "root".
 * Returns the original value (trimmed) for anything else, and '' for empty.
 */
export const toLinuxRoleLabel = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const norm = raw.toLowerCase();
  if (ADMIN_ALIASES.has(norm) || norm.endsWith('_admin') || norm.endsWith('-admin')) {
    return 'root';
  }
  return raw;
};

/** Is this role admin-tier (i.e. displayed as root)? */
export const isAdminRole = (value: unknown): boolean =>
  toLinuxRoleLabel(value) === 'root';
