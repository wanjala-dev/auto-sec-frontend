import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Document, Page, pdfjs } from 'react-pdf';
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
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
 * HudPdfPreviewModal — full-height in-HUD PDF preview.
 *
 * Two modes:
 *  - ``report`` — a report row: fetches the report download endpoint with
 *    ``?inline=1`` (unlocks generated drafts; axios follows the 302->presigned).
 *  - ``file`` — any library file ``{ title, url }``: blob-fetches ``url``
 *    directly (same authed same-origin path; report rows in the library carry
 *    an inline download url so they work here too).
 *
 * Renders EVERY page stacked in a scrollable body so you can scroll the whole
 * document, and tracks the page currently in view for the Page N / M indicator
 * + prev/next controls. HUD-styled, react-icons.
 */
export default function HudPdfPreviewModal({ report = null, file = null, seedId = undefined, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [message, setMessage] = useState('');
  const [pageWidth, setPageWidth] = useState(760);
  const blobUrlRef = useRef(null);
  const scrollRef = useRef(null);
  const pageRefs = useRef({});

  // Title + subtitle differ by mode.
  const heading = (file?.title || report?.title || 'DOCUMENT').toUpperCase();
  const subheading = file
    ? file.subtitle || 'PREVIEW'
    : report?.status === 'approved'
      ? 'APPROVED'
      : 'DRAFT PREVIEW';

  // The fetch request differs by mode: a report goes through the download
  // endpoint (inline=1); a library file blob-fetches its own url.
  const reportId = report?.id;
  const fileUrl = file?.url;

  // Fetch the PDF bytes once, as a blob.
  useEffect(() => {
    let active = true;
    setState('loading');
    setMessage('');
    const req = fileUrl
      ? apiClient.get(fileUrl, { responseType: 'blob' })
      : apiClient.get(`/report/${reportId}/download/`, {
          params: { workspace: seedId, inline: 1 },
          responseType: 'blob'
        });
    req
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
        setMessage(err?.response?.data?.detail || 'Unable to load the PDF.');
      });
    return () => {
      active = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [reportId, fileUrl, seedId]);

  // Fit the page width to the modal (capped for readability).
  useEffect(() => {
    const fit = () => {
      const target = Math.min(window.innerWidth * 0.7, 880);
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

  // Track which page is centred in the scroll viewport → drive the indicator.
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !numPages) return;
    const mid = container.scrollTop + container.clientHeight / 2;
    let best = 1;
    let bestDist = Infinity;
    for (let p = 1; p <= numPages; p += 1) {
      const el = pageRefs.current[p];
      if (!el) continue;
      const center = el.offsetTop + el.offsetHeight / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = p;
      }
    }
    setCurrentPage(best);
  }, [numPages]);

  const goToPage = useCallback((p) => {
    const target = Math.min(Math.max(p, 1), numPages || 1);
    const el = pageRefs.current[target];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
    }
  }, [numPages]);

  // Portal to <body>: HUD panels use transform (dnd-kit / framer-motion), which
  // makes a `position: fixed` child resolve against the panel, not the viewport,
  // clipping the overlay. Rendering into <body> escapes that containing block.
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex h-[92vh] w-[86vw] max-w-[1000px] flex-col border border-hud-line/20 bg-[#0a0f1a]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Report preview"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-hud-line/10 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-[11px] tracking-[0.14em] text-hud-accent">
              {heading}
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-hud-dim">
              {subheading}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex flex-shrink-0 items-center justify-center p-1 text-hud-dim hover:text-hud-accent"
            aria-label="Close preview"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Body — every page stacked, scrollable (min-h-0 lets the flex child scroll) */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="cc-scrollbar flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto bg-black/40 p-4"
        >
          {state === 'loading' && (
            <div className="flex h-full items-center justify-center">
              <HexLoader size={48} label="LOADING PDF" />
            </div>
          )}
          {state === 'error' && (
            <div className="flex h-full items-center justify-center px-6 text-center font-mono text-[10px] text-red-300">
              {message}
            </div>
          )}
          {blobUrl && state !== 'error' && (
            <Document
              file={blobUrl}
              onLoadSuccess={({ numPages: n }) => {
                setNumPages(n || 1);
                setCurrentPage(1);
                setState('ready');
                // Pages render progressively; pin the viewport to the top so the
                // preview always opens on page 1 rather than mid-document.
                requestAnimationFrame(() => {
                  if (scrollRef.current) scrollRef.current.scrollTop = 0;
                });
              }}
              onLoadError={() => {
                setState('error');
                setMessage('Unable to render the PDF.');
              }}
              options={PDF_OPTIONS}
              loading={
                <div className="flex h-full items-center justify-center">
                  <HexLoader size={48} label="RENDERING" />
                </div>
              }
            >
              {numPages
                ? Array.from({ length: numPages }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <div
                        key={pageNum}
                        ref={(el) => {
                          pageRefs.current[pageNum] = el;
                        }}
                        data-page-number={pageNum}
                        className="shadow-[0_0_0_1px_rgba(46,219,232,0.12)]"
                      >
                        <Page
                          pageNumber={pageNum}
                          width={pageWidth}
                          renderAnnotationLayer={false}
                          renderTextLayer={false}
                        />
                      </div>
                    );
                  })
                : null}
            </Document>
          )}
        </div>

        {/* Footer — pagination (prev / N of M / next) */}
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-hud-line/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={state !== 'ready' || currentPage <= 1}
              className="flex items-center justify-center p-1 text-hud-dim hover:text-hud-accent disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous page"
            >
              <FiChevronLeft size={16} />
            </button>
            <span className="min-w-[80px] text-center font-mono text-[10px] tracking-[0.12em] text-hud-dim">
              {state === 'ready' && numPages
                ? `PAGE ${currentPage} / ${numPages}`
                : '—'}
            </span>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={state !== 'ready' || currentPage >= (numPages || 1)}
              className="flex items-center justify-center p-1 text-hud-dim hover:text-hud-accent disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next page"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
          <HudButton variant="ghost" onClick={onClose}>
            CLOSE
          </HudButton>
        </div>
      </div>
    </div>,
    document.body
  );
}

HudPdfPreviewModal.propTypes = {
  // One of `report` or `file` must be provided.
  report: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    status: PropTypes.string
  }),
  file: PropTypes.shape({
    title: PropTypes.string,
    subtitle: PropTypes.string,
    url: PropTypes.string
  }),
  seedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClose: PropTypes.func.isRequired
};
