import apiClient from '../http/apiClient';

export const documentImportApi = {
  /** Upload a file, get back a File record ID. */
  uploadFile: (formData: FormData, onUploadProgress?: (e: any) => void) =>
    apiClient.post('/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    }),

  /** Create a DocumentImport — returns 202, Celery task starts. */
  createImport: (payload: {
    workspace: string;
    source_file: number;
    import_type: string;
    use_ai?: boolean;
    config?: Record<string, unknown>;
  }) => apiClient.post('/imports/', payload),

  /** List imports for a workspace. */
  listImports: (params: {
    workspace: string;
    type?: string;
    status?: string;
  }) => apiClient.get('/imports/', { params }),

  /** Get import detail (for polling status). */
  getImport: (importId: number | string) =>
    apiClient.get(`/imports/${importId}/`),

  /** Get parsed rows for preview. */
  getRows: (importId: number | string) =>
    apiClient.get(`/imports/${importId}/rows/`),

  /** Update a single row. */
  updateRow: (
    importId: number | string,
    rowId: number | string,
    data: Record<string, unknown>
  ) => apiClient.patch(`/imports/${importId}/rows/${rowId}/`, data),

  /** Delete a single row. */
  deleteRow: (importId: number | string, rowId: number | string) =>
    apiClient.delete(`/imports/${importId}/rows/${rowId}/`),

  /** Apply approved rows — creates real records. */
  applyImport: (
    importId: number | string,
    options?: {
      skip_invalid?: boolean;
      create_missing_categories?: boolean;
    }
  ) => apiClient.post(`/imports/${importId}/apply/`, options || {}),

  /** Re-enqueue a failed / stuck import. The backend resets status to
   * ``pending``, bumps retry_count, and dispatches the parse task again. */
  retry: (importId: number | string) =>
    apiClient.post(`/imports/${importId}/retry/`)
};
