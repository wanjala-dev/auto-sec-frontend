import { groupsApi } from '../../infrastructure/workspace/groupsApi';

// ── Group helpers ────────────────────────────────────────────────

const normalizeGroup = (raw: Record<string, unknown> | null) => {
  if (!raw) return null;
  return {
    id: String(raw.id ?? raw.pk ?? raw.uuid ?? ''),
    name: (raw.name as string) || '',
    description: (raw.description as string) || '',
    memberCount: Number(raw.member_count ?? raw.members_count ?? 0),
    members: Array.isArray(raw.members) ? raw.members : [],
    createdAt: (raw.created_at as string) || (raw.created as string) || '',
    updatedAt: (raw.updated_at as string) || (raw.updated as string) || ''
  };
};

const normalizeGroupCollection = (data: unknown) => {
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>)?.results)
    ? ((data as Record<string, unknown>).results as Record<string, unknown>[])
    : [];
  return items.map(normalizeGroup).filter(Boolean);
};

// ── Permission helpers ───────────────────────────────────────────

const normalizePermissionGrant = (raw: Record<string, unknown> | null) => {
  if (!raw) return null;
  return {
    id: String(raw.id ?? raw.pk ?? raw.uuid ?? ''),
    userId: String(raw.user_id ?? raw.user ?? ''),
    groupId: String(raw.group_id ?? raw.group ?? ''),
    permissionKey:
      (raw.permission_key as string) || (raw.permission as string) || '',
    granted: raw.granted !== false,
    createdAt: (raw.created_at as string) || ''
  };
};

const normalizePermissionCollection = (data: unknown) => {
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>)?.results)
    ? ((data as Record<string, unknown>).results as Record<string, unknown>[])
    : [];
  return items.map(normalizePermissionGrant).filter(Boolean);
};

// ── Groups CRUD ──────────────────────────────────────────────────

export const fetchGroups = async (workspaceId: string) => {
  const response = await groupsApi.listGroups(workspaceId);
  return normalizeGroupCollection(response?.data);
};

export const createGroup = async (
  workspaceId: string,
  payload: { name: string; description?: string }
) => {
  const response = await groupsApi.createGroup(workspaceId, payload);
  return normalizeGroup(response?.data);
};

export const updateGroup = async (
  workspaceId: string,
  groupId: string,
  payload: Record<string, unknown>
) => {
  const response = await groupsApi.updateGroup(workspaceId, groupId, payload);
  return normalizeGroup(response?.data);
};

export const deleteGroup = async (workspaceId: string, groupId: string) => {
  await groupsApi.deleteGroup(workspaceId, groupId);
};

export const addGroupMembers = async (
  workspaceId: string,
  groupId: string,
  userIds: string[]
) => {
  const response = await groupsApi.addMembers(workspaceId, groupId, userIds);
  return response?.data ?? null;
};

export const removeGroupMember = async (
  workspaceId: string,
  groupId: string,
  userId: string
) => {
  await groupsApi.removeMember(workspaceId, groupId, userId);
};

// ── Permissions ──────────────────────────────────────────────────

export const fetchPermissions = async (workspaceId: string) => {
  const response = await groupsApi.listPermissions(workspaceId);
  return normalizePermissionCollection(response?.data);
};

export const grantPermission = async (
  workspaceId: string,
  payload: Record<string, unknown>
) => {
  const response = await groupsApi.grantPermission(workspaceId, payload);
  return normalizePermissionGrant(response?.data);
};

export const revokePermission = async (
  workspaceId: string,
  grantId: string
) => {
  await groupsApi.revokePermission(workspaceId, grantId);
};

export const bulkPermissions = async (
  workspaceId: string,
  payload: Record<string, unknown>
) => {
  const response = await groupsApi.bulkPermissions(workspaceId, payload);
  return response?.data ?? null;
};

export const fetchMyPermissions = async (workspaceId: string) => {
  const response = await groupsApi.myPermissions(workspaceId);
  return response?.data ?? null;
};

// ── Matrix / admin helpers ──────────────────────────────────────────

export interface MemberEffectivePermissions {
  userId: string;
  email: string;
  name: string;
  roleSlug: string | null;
  roleName: string | null;
  rolePermissions: string[];
  directPermissions: string[];
  groupPermissions: string[];
  isOwner: boolean;
  membershipStatus: string;
}

const normalizeMemberEffectivePermissions = (
  raw: Record<string, unknown> | null
): MemberEffectivePermissions | null => {
  if (!raw) return null;
  return {
    userId: String(raw.user_id ?? ''),
    email: (raw.email as string) || '',
    name: (raw.name as string) || '',
    roleSlug: (raw.role_slug as string) || null,
    roleName: (raw.role_name as string) || null,
    rolePermissions: Array.isArray(raw.role_permissions)
      ? (raw.role_permissions as string[])
      : [],
    directPermissions: Array.isArray(raw.direct_permissions)
      ? (raw.direct_permissions as string[])
      : [],
    groupPermissions: Array.isArray(raw.group_permissions)
      ? (raw.group_permissions as string[])
      : [],
    isOwner: Boolean(raw.is_owner),
    membershipStatus: (raw.membership_status as string) || ''
  };
};

/**
 * Fetch role + direct + group permission sets for every active member
 * in a workspace. Drives the PermissionsMatrix rows.
 */
export const fetchMembersEffectivePermissions = async (
  workspaceId: string
): Promise<MemberEffectivePermissions[]> => {
  const response = await groupsApi.membersEffectivePermissions(workspaceId);
  const members = Array.isArray(response?.data?.members)
    ? (response.data.members as Record<string, unknown>[])
    : [];
  return members
    .map(normalizeMemberEffectivePermissions)
    .filter((row): row is MemberEffectivePermissions => row !== null);
};

/**
 * Assign a role to a member. ``roleSlug`` is a system slug (owner /
 * admin / finance / donation_steward / etc.) or a workspace-custom-role
 * slug. Returns the updated role payload on success.
 */
export const setMemberRole = async (
  workspaceId: string,
  userId: string,
  roleSlug: string
) => {
  const response = await groupsApi.setMemberRole(workspaceId, userId, roleSlug);
  return response?.data ?? null;
};
