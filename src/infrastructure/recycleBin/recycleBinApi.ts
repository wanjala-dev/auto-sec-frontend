import apiClient from '../http/apiClient';

type Uuid = string;
type EntityType =
  | 'transaction'
  | 'budget'
  | 'category'
  | 'recipient'
  | 'workflow'
  | 'project'
  | 'task'
  | 'column'
  // Template Kernel kinds — every template type deletes to the recycle bin
  // through the same /recycle-bin/trash/ endpoint (entity_type = kind id).
  | 'budget_template'
  | 'writing_template'
  | 'workflow_template'
  | 'application_template'
  | 'report_template'
  | 'grant_snippet'
  | 'donation_form_template'
  | 'brand_asset'
  // Communications artifacts (task #29) — drafts (incl. blogs) and
  // newsletters trash to the bin instead of hard-deleting.
  | 'writing_draft'
  | 'newsletter';

export interface RecycleBinTrashPayload {
  workspace_id: Uuid;
  entity_type: EntityType;
  entity_id: Uuid;
  reason?: string;
}

export interface RecycleBinBulkTrashPayload {
  workspace_id: Uuid;
  entity_type: EntityType;
  entity_ids: Uuid[];
  reason?: string;
}

export const recycleBinApi = {
  trash: (payload: RecycleBinTrashPayload) =>
    apiClient.post('/recycle-bin/trash/', payload),

  trashBulk: (payload: RecycleBinBulkTrashPayload) =>
    apiClient.post('/recycle-bin/trash/bulk/', payload),

  restore: (entryId: Uuid, reason?: string) =>
    apiClient.post(`/recycle-bin/${entryId}/restore/`, {
      reason: reason ?? ''
    }),

  // axios DELETE puts the body under `data` -- DRF reads request.data
  // the same way regardless of method, so the backend sees `reason`
  // exactly like it would on a POST.
  permanentlyDelete: (entryId: Uuid, reason?: string) =>
    apiClient.delete(`/recycle-bin/${entryId}/`, {
      data: { reason: reason ?? '' }
    }),

  empty: (workspaceId: Uuid, reason?: string) =>
    apiClient.delete(`/recycle-bin/empty/?workspace_id=${workspaceId}`, {
      data: { reason: reason ?? '' }
    }),

  list: (params: {
    workspace_id: Uuid;
    entity_type?: string;
    stage?: string;
    limit?: number;
    offset?: number;
  }) => apiClient.get('/recycle-bin/', { params })
};
