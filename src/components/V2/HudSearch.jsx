import React, { useCallback, useEffect, useRef, useState } from 'react';
import HexLoader from './HexLoader';
import HudCard from './HudCard';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { searchSuggestions } from '../../application/search/searchService';
import { SECTION_DISPLAY_ORDER, SECTION_METADATA } from '../Helpers/SearchCom';

const CHAMFER = 14;
const CLIP = `polygon(0 0, calc(100% - ${CHAMFER}px) 0, 100% ${CHAMFER}px, 100% 100%, 0 100%)`;
const MIN_QUERY = 2;

/**
 * V2 HUD Search — terminal-style search with blinking cursor.
 * Dropdown results appear in a chamfered box below.
 */
const HudSearch = ({ seedId, className = '' }) => {
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
          const data = await searchSuggestions({
            query: q,
            limit: 6,
            seedId
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

  // Group results by section
  const sections = results
    ? SECTION_DISPLAY_ORDER.filter((s) => results[s]?.length > 0)
    : [];

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
            bodyClassName="p-0 max-h-[280px] overflow-y-auto cc-scrollbar"
          >
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

          {sections.map((sectionKey) => {
            const meta = SECTION_METADATA[sectionKey] || {};
            const items = results[sectionKey] || [];
            const Icon = meta.icon;
            return (
              <div
                key={sectionKey}
                className="border-b border-hud-line/[0.04] last:border-0"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.01]">
                  {Icon && <Icon size={9} className="text-hud-dim" />}
                  <span className="text-[8px] font-mono text-hud-dim uppercase tracking-wider">
                    {meta.label || sectionKey}
                  </span>
                  <span className="text-[7px] font-mono text-hud-dim ml-auto">
                    {items.length}
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
                    {item.amount && (
                      <span className="text-[9px] font-mono text-emerald-400/60 tabular-nums flex-shrink-0">
                        ${Number(item.amount).toLocaleString()}
                      </span>
                    )}
                  </button>
                ))}
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
  className: PropTypes.string
};

export default HudSearch;
