import apiClient from '../http/apiClient';

export type PresignedPutResponse = {
  put_url: string;
  key: string;
  file_id: number;
  expires_in: number;
};

export const uploadsApi = {
  uploadFile: (formData: FormData) =>
    apiClient.post('/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // Ask the backend for a presigned PUT URL so the browser can upload
  // bytes directly to S3 — bypasses Django gunicorn for the bytes.
  // The backend returns 503 in local dev (LocalMediaStorage) so the
  // caller can fall back to ``uploadFile`` (multipart).
  requestPresignedPut: (payload: {
    filename: string;
    content_type: string;
    workspace_id: string | number;
  }) => apiClient.post<PresignedPutResponse>('/upload/presigned-put/', payload),

  // Step 2 of the presigned flow: tell the backend the PUT succeeded.
  // Indexing (embed + AI insights) is OPT-IN — pass ``index: true`` only
  // when the upload's purpose is AI (the grounding uploader); everything
  // else lands not_indexed until the user clicks Index.
  confirmPresignedPut: (payload: { file_id: number; index?: boolean }) =>
    apiClient.post('/upload/presigned-put/confirm/', payload),

  // Explicitly index a library document into the workspace RAG store so
  // AI chat / drafting can cite it. Quota + circuit-breaker enforced
  // server-side; also the retry path after a failed indexing run.
  indexDocument: (fileId: string | number, workspaceId: string | number) =>
    apiClient.post(`/upload/${fileId}/index/`, {
      workspace_id: String(workspaceId)
    }),

  listUploads: (params?: Record<string, unknown>) =>
    apiClient.get('/upload/', params ? { params } : undefined),

  getUpload: (fileId: string | number, params?: Record<string, unknown>) =>
    apiClient.get(`/upload/${fileId}/`, params ? { params } : undefined),

  fetchResource: (
    path: string,
    options?: {
      params?: Record<string, unknown>;
      responseType?: 'blob' | 'json' | 'text';
    }
  ) =>
    apiClient.get(path, {
      params: options?.params,
      responseType: options?.responseType
    })
};
