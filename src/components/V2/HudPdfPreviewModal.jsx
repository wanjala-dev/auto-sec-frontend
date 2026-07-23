import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

import apiClient from '../../infrastructure/http/apiClient';
import HexLoader from './HexLoader';
import HudButton from './HudButton';

// pdfjs worker (same CDN pin literacyseed uses — react-pdf keys the worker
// version to the bundled pdfjs).
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Stable options reference — react-pdf keys its loadingTask off identity, so a
// new object every render would re-initialise the Document and flicker.
const PDF_OPTIONS = {
  cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
  cMapPacked: true
};

/**
 * HudPdfPreviewModal — in-HUD PDF preview for a generated/approved report.
 *
 * Mirrors literacyseed's report preview: fetch the PDF as a blob through the
 * authed same-origin endpoint (``?inline=1`` so a DRAFT can be reviewed before
 * approval; axios follows the 302→presigned redirect transparently), render it
 * with react-pdf, page through all pages. A full-screen HUD overlay with the
 * V2 chrome. The blob URL is revoked on close.
 */
export default function HudPdfPreviewModal({ report, seedId, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [message, setMessage] = useState('');
  const [pageWidth, setPageWidth] = useState(760);
  const blobUrlRef = useRef(null);

  // Fetch the PDF bytes once, as a blob (renders inline regardless of the
  // server disposition). ``inline: 1`` unlocks preview for generated drafts.
  useEffect(() => {
    let active = true;
    setState('loading');
    setMessage('');
    apiClient
      .get(`/report/${report.id}/download/`, {
        params: { workspace: seedId, inline: 1 },
        responseType: 'blob'
      })
      .then((res) => {
        if (!active) return;
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch((err) => {
        if (!active) return;
        setState('error');
        setMessage(
          err?.response?.data?.detail || 'Unable to load the report PDF.'
        );
      });
    return () => {
      active = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [report.id, seedId]);

  // Fit the page width to the viewport (capped for readability).
  useEffect(() => {
    const fit = () => {
      const target = Math.min(window.innerWidth * 0.62, 900);
      setPageWidth(Math.max(target, 320));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Esc to close.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex max-h-[90vh] w-[80vw] max-w-[960px] flex-col border border-hud-line/20 bg-[#0a0f1a]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Report preview"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-hud-line/10 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-[11px] tracking-[0.14em] text-hud-accent">
              {(report.title || 'REPORT').toUpperCase()}
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-hud-dim">
              {report.status === 'approved' ? 'APPROVED' : 'DRAFT PREVIEW'}
              {numPages ? ` · ${numPages} page${numPages > 1 ? 's' : ''}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 font-mono text-[12px] text-hud-dim hover:text-hud-accent"
            aria-label="Close preview"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="cc-scrollbar flex flex-1 flex-col items-center gap-4 overflow-y-auto bg-black/30 p-4">
          {state === 'loading' && (
            <div className="flex h-72 items-center justify-center">
              <HexLoader size={48} label="LOADING PDF" />
            </div>
          )}
          {state === 'error' && (
            <div className="flex h-72 items-center justify-center px-6 text-center font-mono text-[10px] text-red-300">
              {message}
            </div>
          )}
          {blobUrl && state !== 'error' && (
            <Document
              file={blobUrl}
              onLoadSuccess={({ numPages: n }) => {
                setNumPages(n || 1);
                setState('ready');
              }}
              onLoadError={() => {
                setState('error');
                setMessage('Unable to render the PDF.');
              }}
              options={PDF_OPTIONS}
              loading={
                <div className="flex h-72 items-center justify-center">
                  <HexLoader size={48} label="RENDERING" />
                </div>
              }
            >
              {numPages
                ? Array.from({ length: numPages }, (_, i) => (
                    <div
                      key={i + 1}
                      className="mb-4 shadow-[0_0_0_1px_rgba(46,219,232,0.12)]"
                    >
                      <Page
                        pageNumber={i + 1}
                        width={pageWidth}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                      />
                    </div>
                  ))
                : null}
            </Document>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-hud-line/10 px-4 py-2">
          <HudButton variant="ghost" onClick={onClose}>
            CLOSE
          </HudButton>
        </div>
      </div>
    </div>
  );
}

HudPdfPreviewModal.propTypes = {
  report: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    status: PropTypes.string
  }).isRequired,
  seedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClose: PropTypes.func.isRequired
};
