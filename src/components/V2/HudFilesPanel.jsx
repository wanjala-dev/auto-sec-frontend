import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  FiUploadCloud,
  FiEye,
  FiDownload,
  FiTrash2,
  FiCpu,
  FiFileText,
  FiFile
} from 'react-icons/fi';

import apiClient from '../../infrastructure/http/apiClient';
import { unifiedDocumentsApi } from '../../infrastructure/documentImport/unifiedDocumentsApi';
import { uploadsApi } from '../../infrastructure/uploads/uploadsApi';
import { uploadFileViaPresignedPut } from '../../application/uploads/uploadsService';
import HexLoader from './HexLoader';
import HudButton from './HudButton';
import HudCard from './HudCard';
import HudChip from './HudChip';
import HudPdfPreviewModal from './HudPdfPreviewModal';

/**
 * Files library — every file in the workspace in one place: uploads, imports,
 * knowledge docs, AI-chat PDFs, and generated reports (folded in by the backend
 * ``/documents/`` aggregator). Upload via presigned direct-to-S3 with an opt-in
 * "index for AI" toggle, preview PDFs in-HUD (react-pdf), index a doc into the
 * workspace RAG store on demand, download, and delete.
 *
 * Backend: ``/documents/`` (unified list) + ``/upload/*`` (upload / index /
 * delete). Indexing is opt-in — the human chooses what the AI can read.
 */

// Source → human label + filter membership. "all" is synthetic.
const SOURCE_TABS = [
  { id: 'all', label: 'ALL', sources: null },
  { id: 'uploads', label: 'UPLOADS', sources: ['manual_upload'] },
  { id: 'reports', label: 'REPORTS', sources: ['report'] },
  { id: 'ai_chat', label: 'AI CHAT', sources: ['ai_chat'] },
  { id: 'knowledge', label: 'KNOWLEDGE', sources: ['knowledge_base'] }
];

const SOURCE_LABEL = {
  manual_upload: 'UPLOAD',
  report: 'REPORT',
  ai_chat: 'AI CHAT',
  knowledge_base: 'KNOWLEDGE',
  expense_import: 'IMPORT',
  income_import: 'IMPORT',
  budget_import: 'IMPORT',
  other: 'FILE'
};

// processing_status → chip. Drives the "is this readable by AI" signal.
const INDEX_CHIP = {
  ready: { label: 'INDEXED', border: 'rgba(52,211,153,0.5)', surface: 'rgba(52,211,153,0.10)', text: 'text-emerald-300' },
  pending: { label: 'INDEXING', border: 'rgba(46,219,232,0.45)', surface: 'rgba(46,219,232,0.10)', text: 'text-cyan-400' },
  processing: { label: 'INDEXING', border: 'rgba(46,219,232,0.45)', surface: 'rgba(46,219,232,0.10)', text: 'text-cyan-400' },
  failed: { label: 'INDEX FAILED', border: 'rgba(248,113,113,0.5)', surface: 'rgba(248,113,113,0.10)', text: 'text-red-400' },
  not_indexed: { label: 'NOT INDEXED', border: 'rgba(148,163,184,0.3)', surface: 'rgba(148,163,184,0.06)', text: 'text-hud-dim' }
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
};

const isReportRow = (row) => row.source === 'report';
const isPdf = (row) => (row.file_type || '').toLowerCase() === 'pdf';

export default function HudFilesPanel({ seedId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [previewFile, setPreviewFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [indexAtUpload, setIndexAtUpload] = useState(false);
  const [indexingId, setIndexingId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const fetchFiles = useCallback(async () => {
    if (!seedId) return;
    setLoading(true);
    setError('');
    try {
      const res = await unifiedDocumentsApi.list({ workspace: seedId, limit: 100 });
      setFiles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Could not load the library.');
    } finally {
      setLoading(false);
    }
  }, [seedId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const counts = useMemo(() => {
    const c = { all: files.length };
    for (const tab of SOURCE_TABS) {
      if (tab.sources) c[tab.id] = files.filter((f) => tab.sources.includes(f.source)).length;
    }
    return c;
  }, [files]);

  const visible = useMemo(() => {
    const tab = SOURCE_TABS.find((t) => t.id === activeTab);
    if (!tab || !tab.sources) return files;
    return files.filter((f) => tab.sources.includes(f.source));
  }, [files, activeTab]);

  const handleUpload = useCallback(
    async (fileList) => {
      const list = Array.from(fileList || []);
      if (!list.length || !seedId) return;
      setUploading(true);
      setError('');
      try {
        for (const file of list) {
          // Reuse the shared presigned uploader (handles direct-to-S3 + the
          // 503 multipart fallback + opt-in indexing). Never re-roll this.
          await uploadFileViaPresignedPut({ file, workspaceId: seedId, requestIndexing: indexAtUpload });
        }
        await fetchFiles();
      } catch {
        setError('Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [seedId, indexAtUpload, fetchFiles]
  );

  const handleIndex = useCallback(
    async (row) => {
      if (!seedId || isReportRow(row)) return;
      setIndexingId(row.id);
      try {
        await uploadsApi.indexDocument(row.id, seedId);
        await fetchFiles();
      } catch {
        setError('Could not queue indexing for that document.');
      } finally {
        setIndexingId(null);
      }
    },
    [seedId, fetchFiles]
  );

  const handleDelete = useCallback(
    async (row) => {
      if (isReportRow(row)) return;
      // eslint-disable-next-line no-alert
      if (!window.confirm(`Delete "${row.filename}"? This cannot be undone.`)) return;
      try {
        await apiClient.delete(`/upload/${row.id}/`);
        setFiles((prev) => prev.filter((f) => f.id !== row.id));
      } catch {
        setError('Could not delete that file.');
      }
    },
    []
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer?.files?.length) handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border px-2.5 py-1 font-mono text-[9px] tracking-[0.12em] transition ${
                activeTab === tab.id
                  ? 'border-hud-accent/50 bg-cyan-500/[0.08] text-hud-accent'
                  : 'border-hud-line/10 text-hud-dim hover:text-hud-accent'
              }`}
            >
              {tab.label}
              <span className="ml-1 text-hud-dim">{counts[tab.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIndexAtUpload((v) => !v)}
            className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.1em] text-hud-dim hover:text-hud-accent"
            title="Index uploaded files into the workspace AI store"
          >
            <span
              className={`inline-flex h-3 w-3 items-center justify-center border text-[8px] ${
                indexAtUpload ? 'border-hud-accent/60 bg-cyan-500/20 text-hud-accent' : 'border-hud-line/20'
              }`}
            >
              {indexAtUpload ? '✓' : ''}
            </span>
            INDEX FOR AI
          </button>
          <HudButton variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <FiUploadCloud size={13} />
            {uploading ? 'UPLOADING…' : 'UPLOAD'}
          </HudButton>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {error ? <p className="mb-3 font-mono text-[10px] text-red-300">{error}</p> : null}

      {/* Drop zone + grid */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`min-h-[50vh] border border-dashed p-3 transition ${
          dragOver ? 'border-hud-accent/60 bg-cyan-500/[0.04]' : 'border-hud-line/10'
        }`}
      >
        {loading ? (
          <div className="flex h-72 items-center justify-center">
            <HexLoader size={48} label="LOADING LIBRARY" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-2 text-center">
            <FiUploadCloud size={28} className="text-hud-dim" />
            <p className="font-mono text-[10px] tracking-[0.14em] text-hud-dim">
              NO FILES YET — DROP FILES HERE OR USE UPLOAD
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((row) => {
              const report = isReportRow(row);
              const pdf = isPdf(row);
              const indexChip = report
                ? INDEX_CHIP.ready
                : INDEX_CHIP[row.processing_status] || INDEX_CHIP.not_indexed;
              const canIndex = !report && ['not_indexed', 'failed'].includes(row.processing_status);
              return (
                <HudCard key={row.id} bodyClassName="p-3" border={report ? 'emerald' : 'cyan'}>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-hud-accent">
                      {pdf ? <FiFileText size={16} /> : <FiFile size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[11px] text-hud-text" title={row.filename}>
                        {row.filename || 'File'}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <HudChip>{SOURCE_LABEL[row.source] || (row.source || 'FILE').toUpperCase()}</HudChip>
                        <HudChip
                          active
                          activeBorder={indexChip.border}
                          activeSurface={indexChip.surface}
                          className={indexChip.text}
                        >
                          {indexChip.label}
                        </HudChip>
                        <span className="font-mono text-[8px] text-hud-dim">{formatDate(row.created)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {pdf ? (
                      <HudButton
                        variant="ghost"
                        onClick={() =>
                          setPreviewFile({
                            title: row.filename,
                            subtitle: SOURCE_LABEL[row.source] || 'PREVIEW',
                            url: row.file_url
                          })
                        }
                      >
                        <FiEye size={12} />
                        PREVIEW
                      </HudButton>
                    ) : null}
                    {canIndex ? (
                      <HudButton variant="ghost" onClick={() => handleIndex(row)} disabled={indexingId === row.id}>
                        <FiCpu size={12} />
                        {indexingId === row.id ? '…' : 'INDEX'}
                      </HudButton>
                    ) : null}
                    <a
                      href={row.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 border border-hud-line/10 px-2 py-1 font-mono text-[10px] text-hud-dim transition hover:text-hud-accent"
                    >
                      <FiDownload size={12} />
                      OPEN
                    </a>
                    {!report ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="inline-flex items-center gap-1 border border-hud-line/10 px-2 py-1 font-mono text-[10px] text-hud-dim transition hover:text-red-400"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    ) : null}
                  </div>
                </HudCard>
              );
            })}
          </div>
        )}
      </div>

      {previewFile ? (
        <HudPdfPreviewModal file={previewFile} seedId={seedId} onClose={() => setPreviewFile(null)} />
      ) : null}
    </div>
  );
}

HudFilesPanel.propTypes = {
  seedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};
