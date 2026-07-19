import React from 'react';
import { FiChevronRight } from 'react-icons/fi';
import { HUD_CLIP_SM } from './v2Constants';

/**
 * Promotional banner inviting users to try V2.
 * Renders in V1 pages (e.g. user preferences) without importing any V1 components.
 *
 * Props:
 *  - onTryV2  {fn}  called when user clicks the banner
 */
export default function TryV2Banner({ onTryV2 }) {
  return (
    <button
      type="button"
      onClick={onTryV2}
      className="w-full flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition group"
      style={{ clipPath: HUD_CLIP_SM }}
    >
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-white">
          Try the new Command Center V2
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Sci-fi dashboard with AI agents, drag-and-drop panels, and voice
          input.
        </p>
      </div>
      <FiChevronRight
        size={18}
        className="text-cyan-500/40 group-hover:text-cyan-400 transition flex-shrink-0"
      />
    </button>
  );
}
