import axios from 'axios';

import { extractUploadMeta } from '../../domain/uploads/uploadMeta';
import { uploadsApi } from '../../infrastructure/uploads/uploadsApi';

export const uploadWorkspaceFile = async ({
  file,
  workspaceId,
  workspaceField = 'workspace_id',
  requestIndexing = false
}: {
  file: File;
  workspaceId?: string | number | null;
  workspaceField?: string;
  requestIndexing?: boolean;
}) => {
  if (!file) {
    throw new Error('A file is required.');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (workspaceId) {
    formData.append(workspaceField, String(workspaceId));
  }
  if (requestIndexing) {
    // Indexing is opt-in — only uploads whose purpose is AI grounding ask.
    formData.append('index', 'true');
  }

  const response = await uploadsApi.uploadFile(formData);
  return extractUploadMeta(response?.data);
};

/**
 * Upload a file directly to S3 via a presigned PUT URL.
 *
 * Two-step flow:
 *   1. POST /upload/presigned-put/ — backend allocates a File row +
 *      generates a presigned PUT URL.
 *   2. axios.put(put_url, file) — bytes travel browser → S3 directly,
 *      never through Django gunicorn.
 *
 * Returns ``{ key, id, url }``:
 *   - ``key`` is what callers should store on referencing rows
 *     (e.g. ``Recipient.photo_url``). Backend signs at read time.
 *   - ``id`` feeds downstream M2M (e.g. ``Recipient.multimedia``).
 *   - ``url`` is a best-effort canonical URL — present for parity with
 *     the multipart helper but callers should prefer ``key``.
 *
 * Falls back to the multipart ``uploadWorkspaceFile`` when the backend
 * returns 503 (storage isn't S3-backed, e.g. local dev with
 * LocalMediaStorage). The fallback path keeps recipient creation
 * working in dev without requiring MinIO setup for the media bucket.
 */
export const uploadFileViaPresignedPut = async ({
  file,
  workspaceId,
  requestIndexing = false
}: {
  file: File;
  workspaceId: string | number;
  requestIndexing?: boolean;
}) => {
  if (!file) {
    throw new Error('A file is required.');
  }
  if (!workspaceId) {
    throw new Error('A workspace id is required.');
  }

  try {
    const presignedResponse = await uploadsApi.requestPresignedPut({
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      workspace_id: workspaceId
    });

    const { put_url, key, file_id } = presignedResponse.data;

    // Direct browser → S3 PUT. Use a bare axios instance so we don't
    // attach our API ``Authorization`` header (S3 rejects requests
    // that carry unexpected headers — they break the signature).
    await axios.put(put_url, file, {
      headers: file.type ? { 'Content-Type': file.type } : {},
      withCredentials: false,
      transformRequest: [(data) => data]
    });

    // Step 2: the bytes are in S3 — confirm they landed. Indexing is
    // opt-in: only callers whose purpose is AI grounding pass
    // requestIndexing (the backend meters those through the quota +
    // breaker policy). Non-fatal: the upload itself succeeded and the
    // document can be indexed later from the Library.
    try {
      await uploadsApi.confirmPresignedPut({
        file_id,
        ...(requestIndexing ? { index: true } : {})
      });
    } catch {
      // eslint-disable-next-line no-console
      console.warn('Upload confirm failed for file', file_id);
    }

    // Reconstruct a canonical URL by stripping the query string from
    // ``put_url``. The frontend never *uses* this URL (read flows go
    // through the backend serializer, which re-signs from ``key``)
    // but some callers still inspect ``url`` so keep it populated.
    const canonicalUrl = put_url.split('?')[0] || '';

    return {
      key,
      id: file_id,
      url: canonicalUrl
    };
  } catch (error: any) {
    if (error?.response?.status === 503) {
      // Backend signals "presigned uploads disabled in this env" —
      // fall back to multipart so the flow still works in local dev.
      const meta = await uploadWorkspaceFile({
        file,
        workspaceId,
        workspaceField: 'workspace_id',
        requestIndexing
      });
      return {
        key: meta?.file_path || meta?.url || '',
        id: meta?.id ?? null,
        url: meta?.url || ''
      };
    }
    throw error;
  }
};

export const fetchUploadDetail = async (
  fileId: string | number,
  params?: Record<string, unknown>
) => {
  const response = await uploadsApi.getUpload(fileId, params);
  return response?.data ?? null;
};

export const listWorkspaceUploads = async (
  params?: Record<string, unknown>
) => {
  const response = await uploadsApi.listUploads(params);
  return response?.data ?? null;
};

export const fetchUploadResource = async ({
  path,
  params,
  responseType = 'blob'
}: {
  path: string;
  params?: Record<string, unknown>;
  responseType?: 'blob' | 'json' | 'text';
}) => {
  const response = await uploadsApi.fetchResource(path, {
    params,
    responseType
  });
  return response?.data;
};
