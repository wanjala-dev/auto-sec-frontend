import apiClient from '../http/apiClient';

/**
 * Client-deliverable report API.
 *
 * Backend: the `report` bounded context, mounted at `/report/` (the apiClient
 * baseURL already carries the `/api/v1` prefix). Every call is workspace-scoped
 * via `?workspace=<id>`.
 */
export const reportsApi = {
  /** GET /report/kinds/ — the kind picker (pentest today). */
  getKinds: () => apiClient.get('/report/kinds/'),

  /** GET /report/?workspace=<id> — list a workspace's reports, newest first. */
  list: (workspaceId: string | number) =>
    apiClient.get('/report/', { params: { workspace: workspaceId } }),

  /** GET /report/<id>/?workspace=<id> — status + detail. */
  get: (reportId: string, workspaceId: string | number) =>
    apiClient.get(`/report/${reportId}/`, {
      params: { workspace: workspaceId }
    }),

  /** POST /report/generate/?workspace=<id> — create draft + enqueue → 202. */
  generate: (
    workspaceId: string | number,
    payload: {
      kind: string;
      title?: string;
      scope?: Record<string, unknown>;
    }
  ) =>
    apiClient.post('/report/generate/', payload, {
      params: { workspace: workspaceId }
    }),

  /** POST /report/<id>/approve/?workspace=<id> — owner/admin sign-off. */
  approve: (reportId: string, workspaceId: string | number) =>
    apiClient.post(
      `/report/${reportId}/approve/`,
      {},
      { params: { workspace: workspaceId } }
    ),

  /**
   * Build the download URL for a report's PDF. The endpoint 302-redirects to a
   * presigned URL (only once approved), so opening it in a new tab lets the
   * browser follow the redirect and stream the PDF directly.
   */
  downloadUrl: (reportId: string, workspaceId: string | number): string => {
    const base = (apiClient.defaults.baseURL || '').replace(/\/+$/, '');
    return `${base}/report/${reportId}/download/?workspace=${encodeURIComponent(
      String(workspaceId)
    )}`;
  }
};

export interface ReportKind {
  id: string;
  title: string;
  enabled: boolean;
}

export type ReportStatus =
  | 'draft'
  | 'generating'
  | 'generated'
  | 'approved'
  | 'failed';

export interface ReportRecord {
  id: string;
  workspace_id: string;
  kind: string;
  title: string;
  status: ReportStatus;
  scope: Record<string, unknown>;
  finding_count: number;
  downloadable: boolean;
  narrative_faithful: boolean;
  error_message: string;
  pdf_generated_at: string | null;
  approved_at: string | null;
  approved_by_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}
