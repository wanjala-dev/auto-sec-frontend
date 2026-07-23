import React, { useCallback, useEffect, useRef, useState } from 'react';
import HexLoader from './HexLoader';
import HudCard from './HudCard';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiZap, FiChevronRight } from 'react-icons/fi';
import { searchSuggestions } from '../../application/search/searchService';
import { SECTION_DISPLAY_ORDER, SECTION_METADATA } from '../Helpers/SearchCom';

const CHAMFER = 14;
const CLIP = `polygon(0 0, calc(100% - ${CHAMFER}px) 0, 100% ${CHAMFER}px, 100% 100%, 0 100%)`;
const MIN_QUERY = 2;

// Severity band → score-badge colour (mirrors the report/CVSS band palette).
// The backend suggests an indicative CVSS score per finding; the badge makes a
// critical/high finding jump out of the omnibox like a SOC search's score chip.
const SEV_BADGE = {
  critical: 'bg-[#b00020] text-white',
  high: 'bg-[#c2410c] text-white',
  medium: 'bg-[#b7791f] text-black',
  low: 'bg-[#2f7d32] text-white'
};

/**
 * V2 HUD Search — terminal-style search with blinking cursor.
 * Dropdown results appear in a chamfered box below: an optional "ask AI" row,
 * then results grouped by SOC section (findings carry a severity score badge),
 * each section with a "see all" deep-link.
 */
const HudSearch = ({ seedId, className = '', onAskAi = null }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const handleSearch = useCallback(
    (q) => {
      if (q.length < MIN_QUERY) {
        setResults(null);
        setOpen(false);
        return;
      }

      setLoading(true);
      setOpen(true);

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          // Returns normalized sections: [{ key, total, results: [...] }, …]
          const data = await searchSuggestions({
            query: q,
            limit: 6,
            seedId,
            displayOrder: SECTION_DISPLAY_ORDER
          });
          setResults(data);
        } catch {
          setResults(null);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [seedId]
  );

  const handleChange = useCallback(
    (e) => {
      const val = e.target.value;
      setQuery(val);
      handleSearch(val);
    },
    [handleSearch]
  );

  const handleSelect = useCallback(
    (item) => {
      setOpen(false);
      setQuery('');
      if (item?.url) navigate(item.url);
    },
    [navigate]
  );

  const handleAskAi = useCallback(() => {
    const q = query.trim();
    if (!q || !onAskAi) return;
    onAskAi(q);
    setOpen(false);
    setQuery('');
  }, [query, onAskAi]);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Normalized sections ([{ key, total, results }]) — already ordered and
  // non-empty-only (normalizeSearchSections drops empty segments).
  const sections = Array.isArray(results) ? results : [];

  return (
    <div className={`relative ${className}`} ref={inputRef}>
      {/* Search input */}
      <div
        className="flex items-center gap-2 bg-hud-surface/40 backdrop-blur-sm border border-hud-line/10 px-2 py-[3px]"
        style={{ clipPath: CLIP }}
      >
        <FiSearch size={10} className="text-hud-dim flex-shrink-0" />
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            className="w-full bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none text-[10px] font-mono text-hud-dim caret-transparent"
            placeholder=""
          />
          {/* Blinking cursor when empty */}
          {!query && (
            <div className="absolute inset-0 flex items-center pointer-events-none">
              <span className="text-[10px] font-mono text-hud-dim">
                Search
              </span>
              <span
                className="text-[11px] font-mono text-cyan-500 ml-[1px]"
                style={{ animation: 'cc-blink 1s step-end infinite' }}
              >
                ▌
              </span>
            </div>
          )}
        </div>
        {loading && <HexLoader size={16} />}
      </div>

      {/* Results dropdown */}
      {open && query.length >= MIN_QUERY && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <HudCard
            chamfer={CHAMFER}
            surface="bg-[#0a0f1a]/95 backdrop-blur-xl"
            bodyClassName="p-0 max-h-[320px] overflow-y-auto cc-scrollbar"
          >
          {/* Ask-AI row — route the raw query into the SOC copilot */}
          {onAskAi && (
            <button
              type="button"
              onClick={handleAskAi}
              className="w-full text-left px-2.5 py-2 hover:bg-cyan-500/[0.06] transition flex items-center gap-2 border-b border-hud-line/[0.06]"
            >
              <FiZap size={11} className="text-hud-accent flex-shrink-0" />
              <span className="text-[10px] font-mono text-hud-accent truncate">
                Ask AI about
              </span>
              <span className="text-[10px] font-mono text-hud-dim truncate flex-1">
                “{query.trim()}”
              </span>
            </button>
          )}

          {loading && !results && (
            <div className="flex w-full justify-center py-4">
              <HexLoader size={36} label="SEARCHING" />
            </div>
          )}

          {!loading && sections.length === 0 && (
            <p className="text-[9px] font-mono text-hud-dim text-center py-4">
              NO RESULTS
            </p>
          )}

          {sections.map((section) => {
            const meta = SECTION_METADATA[section.key] || {};
            const items = section.results || [];
            const Icon = meta.icon;
            const total = section.total ?? items.length;
            const seeAllUrl = items[0]?.url;
            return (
              <div
                key={section.key}
                className="border-b border-hud-line/[0.04] last:border-0"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.01]">
                  {Icon && <Icon size={9} className="text-hud-dim" />}
                  <span className="text-[8px] font-mono text-hud-dim uppercase tracking-wider">
                    {meta.label || section.key}
                  </span>
                  <span className="text-[7px] font-mono text-hud-dim ml-auto">
                    {total}
                  </span>
                </div>
                {items.map((item, i) => (
                  <button
                    key={item.id || i}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-500/[0.04] transition flex items-center gap-2"
                  >
                    <span className="text-[10px] font-mono text-hud-dim truncate flex-1">
                      {item.title ||
                        item.name ||
                        item.label ||
                        item.email ||
                        '—'}
                    </span>
                    {item.subtitle && (
                      <span className="text-[9px] font-mono text-hud-dim/60 truncate max-w-[35%] flex-shrink-0">
                        {item.subtitle}
                      </span>
                    )}
                    {/* Severity score badge (findings only) */}
                    {item.severity && item.score != null && (
                      <span
                        className={`flex-shrink-0 px-1.5 py-0.5 text-[9px] font-mono font-bold tabular-nums ${
                          SEV_BADGE[item.severity] || 'bg-hud-line/20 text-hud-dim'
                        }`}
                      >
                        {Number(item.score).toFixed(1)}
                      </span>
                    )}
                  </button>
                ))}
                {/* See all matching <section> */}
                {seeAllUrl && (
                  <button
                    type="button"
                    onClick={() => handleSelect({ url: seeAllUrl })}
                    className="w-full text-left px-2.5 py-1 hover:bg-cyan-500/[0.04] transition flex items-center gap-1.5 text-hud-dim/70 hover:text-hud-accent"
                  >
                    <FiChevronRight size={9} className="flex-shrink-0" />
                    <span className="text-[8px] font-mono uppercase tracking-wider">
                      See all matching {meta.label || section.key}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
          </HudCard>
        </div>
      )}
    </div>
  );
};

HudSearch.propTypes = {
  seedId: PropTypes.string,
  className: PropTypes.string,
  onAskAi: PropTypes.func
};

export default HudSearch;
