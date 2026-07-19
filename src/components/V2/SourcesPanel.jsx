/**
 * V2 RAG sources panel — HUD-styled sibling of
 * ``src/components/AISources/SourcesPanel.jsx``.
 *
 * Per CLAUDE.md V1/V2 separation rule the two are independent
 * components, not a single component with a ``variant`` prop. They
 * share data shape but render different markup: V2 uses sharp edges,
 * monospace font, and a cyan accent to match the surrounding HUD
 * chrome on ``HudChatPanel``.
 *
 * Plan reference:
 * ``/Users/henrywanjala/.claude/plans/atomic-gathering-fox.md``
 * AI Fluency Wave 2 — citations / Discernment.
 */
import React from 'react';

const TRUNCATE_AT = 220;

function truncate(text) {
  if (!text || typeof text !== 'string') return '';
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= TRUNCATE_AT) return cleaned;
  return cleaned.slice(0, TRUNCATE_AT).trimEnd() + '…';
}

function buildLabel(source, index) {
  const title = (source?.section_title || source?.section || '').trim();
  if (title) return title;
  return `SOURCE_${String(index + 1).padStart(2, '0')}`;
}

function formatScore(score) {
  if (score === null || score === undefined || score === 0) return '';
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return '';
  return numeric.toFixed(2);
}

const SourcesPanelV2 = ({ sources }) => {
  if (!Array.isArray(sources) || sources.length === 0) return null;

  return (
    <details className="mt-2 w-full font-mono text-[10px] text-cyan-200/80">
      <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 border border-cyan-500/30 bg-cyan-500/[0.06] px-2.5 py-0.5 font-semibold tracking-[0.12em] text-cyan-300 hover:bg-cyan-500/[0.12]">
        <span className="block h-1.5 w-1.5 bg-cyan-400" />
        <span>
          {sources.length} SOURCE{sources.length === 1 ? '' : 'S'}
        </span>
      </summary>
      <ol className="mt-2 space-y-2 pl-3 border-l border-cyan-500/20">
        {sources.map((source, index) => {
          const label = buildLabel(source, index);
          const score = formatScore(source?.score);
          const excerpt = truncate(source?.content);
          return (
            <li key={`${label}-${index}`} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold tracking-[0.08em] text-cyan-200">
                  {label.toUpperCase()}
                </span>
                {score && (
                  <span className="text-[9px] tracking-[0.16em] text-cyan-400/60">
                    SCORE {score}
                  </span>
                )}
              </div>
              {excerpt && (
                <p className="font-sans text-[11px] leading-relaxed text-gray-300">
                  {excerpt}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
};

export default SourcesPanelV2;
