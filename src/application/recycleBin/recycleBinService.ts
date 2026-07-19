import { recycleBinApi } from '../../infrastructure/recycleBin/recycleBinApi';
import { normalizeWorkspaceId as normalizeSeedId } from '../../domain/workspace/workspaceId';

type Uuid = string;
type EntityType =
  | 'transaction'
  | 'budget'
  | 'category'
  | 'recipient'
  | 'task'
  | 'column'
  | 'brand_asset';

export interface TrashedEntry {
  id: Uuid;
  entity_type: EntityType;
  entity_id: Uuid;
  entity_name?: string;
  stage?: string;
  trashed_until?: string;
}

const requireSeedId = (seedId: Uuid | string | null | undefined): Uuid => {
  const resolved = normalizeSeedId(seedId);
  if (!resolved) {
    throw new Error('A workspace is required to delete this row.');
  }
  return resolved;
};

/** Soft-delete a single row. Returns the bin entry so the caller can undo. */
export const trashEntity = async ({
  entityType,
  entityId,
  seedId,
  reason
}: {
  entityType: EntityType;
  entityId: Uuid;
  seedId: Uuid | string | null | undefined;
  reason?: string;
}): Promise<TrashedEntry> => {
  const workspaceId = requireSeedId(seedId);
  const { data } = await recycleBinApi.trash({
    workspace_id: workspaceId,
    entity_type: entityType,
    entity_id: entityId,
    reason: reason ?? ''
  });
  return data as TrashedEntry;
};

/** Soft-delete many rows. Returns the bin entries successfully trashed.
 *
 * The server caps a single call at 500 ids and returns 207 Multi-Status
 * on partial failure. We surface that to the caller so the UI can render
 * "Deleted N, failed M" instead of a binary success/fail toast.
 */
export const trashEntitiesBulk = async ({
  entityType,
  entityIds,
  seedId,
  reason
}: {
  entityType: EntityType;
  entityIds: Uuid[];
  seedId: Uuid | string | null | undefined;
  reason?: string;
}): Promise<{
  trashed: TrashedEntry[];
  failed: Array<{ entity_id: Uuid; reason: string }>;
}> => {
  const workspaceId = requireSeedId(seedId);
  const { data } = await recycleBinApi.trashBulk({
    workspace_id: workspaceId,
    entity_type: entityType,
    entity_ids: entityIds,
    reason: reason ?? ''
  });
  return {
    trashed: (data?.trashed as TrashedEntry[]) || [],
    failed: (data?.failed as Array<{ entity_id: Uuid; reason: string }>) || []
  };
};

/** Reverse a trash. Used by the Undo toast and the recycle bin page. */
export const restoreEntry = async (
  entryId: Uuid,
  reason?: string
): Promise<TrashedEntry> => {
  const { data } = await recycleBinApi.restore(entryId, reason);
  return data as TrashedEntry;
};

/** Permanently remove a single bin entry. Cannot be undone. */
export const permanentlyDeleteEntry = async (
  entryId: Uuid,
  reason?: string
): Promise<void> => {
  await recycleBinApi.permanentlyDelete(entryId, reason);
};

/** Permanently remove every entry in the bin for this workspace. */
export const emptyBin = async (
  seedId: Uuid | string | null | undefined,
  reason?: string
): Promise<void> => {
  const workspaceId = requireSeedId(seedId);
  await recycleBinApi.empty(workspaceId, reason);
};
