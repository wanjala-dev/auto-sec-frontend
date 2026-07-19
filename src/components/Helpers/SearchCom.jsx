import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback
} from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers,
  FiDollarSign,
  FiGift,
  FiCalendar,
  FiTag,
  FiLayers,
  FiBookOpen,
  FiGlobe
} from 'react-icons/fi';
import Icons from './Icons';
import Input from '../Input/TextField/Input';
import Button from '../Button/Button';
import LoadingSpinner from '../Utility/LoadingSpinner/Loading';
import CollapsableCard from '../Card/CollapsableCard';
import { searchSuggestions } from '../../application/search/searchService';
import { formatAmount } from '../../shared/money';
import { useViewerSession } from '../../features/auth/presentation/useViewerSession';

const MIN_SUGGEST_LENGTH = 2;
const SUGGEST_LIMIT = 8;

export const SECTION_DISPLAY_ORDER = [
  'transactions',
  'donations',
  'events',
  'users',
  'products',
  'categories',
  'news'
];

export const SECTION_METADATA = {
  transactions: {
    label: 'Transactions',
    icon: FiDollarSign,
    iconBg: 'bg-emerald-500/15 text-emerald-300'
  },
  donations: {
    label: 'Donations',
    icon: FiGift,
    iconBg: 'bg-pink-500/15 text-pink-300'
  },
  events: {
    label: 'Events',
    icon: FiCalendar,
    iconBg: 'bg-indigo-500/15 text-indigo-300'
  },
  users: {
    label: 'People',
    icon: FiUsers,
    iconBg: 'bg-sky-500/15 text-sky-300'
  },
  products: {
    label: 'Products',
    icon: FiTag,
    iconBg: 'bg-orange-500/15 text-orange-300'
  },
  categories: {
    label: 'Categories',
    icon: FiLayers,
    iconBg: 'bg-lime-500/15 text-lime-300'
  },
  news: {
    label: 'News',
    icon: FiBookOpen,
    iconBg: 'bg-purple-500/15 text-purple-300'
  },
  default: {
    label: 'Results',
    icon: FiGlobe,
    iconBg: 'bg-gray-500/15 text-gray-300'
  }
};

const withFocus = (base, item) => {
  const id = item?.id || item?.pk || item?.slug || item?.uuid;
  if (!id) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}focus=${encodeURIComponent(id)}`;
};

// Destination routes use the active workspace as the seed_id, since the
// live routes (e.g. /transactions/all/:seed_id) are workspace-scoped.
// `focus` carries the item id so destination pages can open the specific
// row / modal for it (pages opt in to reading `focus`).
export const buildSectionRoute = (sectionKey, item, activeSeedId) => {
  const seed = activeSeedId ? String(activeSeedId) : null;
  switch (sectionKey) {
    case 'donations':
      return seed ? withFocus(`/donations/${seed}`, item) : '/donations';
    case 'transactions':
      return seed
        ? withFocus(`/transactions/all/${seed}`, item)
        : '/transactions';
    case 'events':
      return seed
        ? withFocus(`/fundraising/events/${seed}`, item)
        : '/fundraising/events';
    case 'users':
      // People search lands on the Contacts directory (the old
      // /teams/directories surface was delinked in the nav rework).
      return withFocus('/contacts', item);
    case 'products':
      if (item?.id) return `/shop/store/${item.id}`;
      if (item?.slug) return `/shop/product/detail/${item.slug}`;
      return '/shop';
    case 'categories':
      return item?.slug
        ? `/shop?category=${encodeURIComponent(item.slug)}`
        : '/shop';
    case 'news':
      return item?.url || item?.absolute_url || null;
    default:
      return null;
  }
};

// Legacy export kept for backwards compatibility with existing consumers
// (e.g. SearchResultsPage). New code should call `buildSectionRoute` so
// routes stay workspace-aware.
export const SECTION_ROUTE_MAP = {
  donations: (item) => buildSectionRoute('donations', item, null),
  transactions: (item) => buildSectionRoute('transactions', item, null),
  events: (item) => buildSectionRoute('events', item, null),
  users: (item) => buildSectionRoute('users', item, null),
  products: (item) => buildSectionRoute('products', item, null),
  categories: (item) => buildSectionRoute('categories', item, null),
  news: (item) => buildSectionRoute('news', item, null)
};

const firstNonEmpty = (candidates = [], fallback = '') => {
  for (const candidate of candidates) {
    if (
      candidate !== null &&
      candidate !== undefined &&
      String(candidate).trim().length
    ) {
      return String(candidate).trim();
    }
  }
  return fallback;
};

export const flattenSections = (sections) => {
  const list = [];
  sections.forEach((section) => {
    section.results.forEach((item) => {
      list.push({ sectionKey: section.key, item });
    });
  });
  return list;
};

const SearchLoadingIndicator = () => (
  <div className="flex min-h-[140px] items-center justify-center border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-[#0d1426]">
    <LoadingSpinner overlay={false} size={0.45} message="Searching..." />
  </div>
);

export default function SearchCom({ className, inputClasses }) {
  const navigate = useNavigate();
  const { storedActiveSeedId } = useViewerSession();
  const [query, setQuery] = useState('');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const controllerRef = useRef(null);

  // CollapsableCard owns its own expanded/collapsed state internally,
  // so the search overlay no longer tracks per-section collapse here.
  const flatResults = useMemo(() => flattenSections(sections), [sections]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [closeDropdown]);

  const fetchSuggestions = useCallback(async (term) => {
    const trimmed = term?.trim() || '';
    if (trimmed.length < MIN_SUGGEST_LENGTH) {
      setSections([]);
      setError(null);
      setLoading(false);
      setIsOpen(Boolean(trimmed.length));
      setActiveIndex(-1);
      return;
    }
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();
    setLoading(true);
    setError(null);
    setIsOpen(true);
    setActiveIndex(-1);

    try {
      const combinedSections = await searchSuggestions({
        query: trimmed,
        limit: SUGGEST_LIMIT,
        displayOrder: SECTION_DISPLAY_ORDER,
        signal: controllerRef.current.signal
      });
      setSections(combinedSections);
      setActiveIndex(combinedSections.length ? 0 : -1);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            'Unable to fetch suggestions.'
        );
        setSections([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSuggestions(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  const resolveResultLabel = (item, fallbackIndex = 0) =>
    firstNonEmpty(
      [
        item?.label,
        item?.name,
        item?.title,
        item?.full_name,
        item?.username,
        item?.headline,
        item?.description,
        item?.reference
      ],
      `Result ${fallbackIndex + 1}`
    );

  const formatCurrency = (value, currency = 'USD') => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return '';
    }
    return formatAmount(amount, currency, { compact: amount % 1 === 0 });
  };

  const resolveResultAmount = (sectionKey, item) => {
    if (sectionKey !== 'donations' && sectionKey !== 'transactions') {
      return '';
    }
    const meta = item?.meta || {};
    const raw = meta.amount ?? item?.amount;
    return raw !== undefined && raw !== null && raw !== ''
      ? formatCurrency(raw, meta.currency || item?.currency)
      : '';
  };

  const resolveResultSubLabel = (sectionKey, item) => {
    const meta = item?.meta || {};
    if (sectionKey === 'donations' || sectionKey === 'transactions') {
      return meta.notes || meta.status || item?.description || '';
    }
    if (sectionKey === 'users') {
      return meta.email || item?.email || item?.role || '';
    }
    if (sectionKey === 'events') {
      return meta.city || item?.location || item?.status || '';
    }
    if (meta.excerpt) return meta.excerpt;
    if (item?.summary) return item.summary;
    if (item?.description) return item.description;
    return '';
  };

  const handleResultClick = (sectionKey, item) => {
    const destination = buildSectionRoute(sectionKey, item, storedActiveSeedId);
    if (destination) {
      if (/^https?:\/\//i.test(destination)) {
        window.open(destination, '_blank', 'noopener,noreferrer');
      } else {
        navigate(destination);
      }
      closeDropdown();
      return;
    }
    // Fallback: land on the search results page so the user can still
    // discover the item when we don't have a direct route (e.g. news
    // entries missing a url).
    const trimmed = query.trim();
    if (!trimmed) {
      closeDropdown();
      return;
    }
    const params = new URLSearchParams();
    params.set('q', trimmed);
    params.set('source', 'omnibox');
    params.set('section', sectionKey);
    const focusId = item?.id || item?.pk || item?.slug || item?.uuid;
    if (focusId) params.set('focus', String(focusId));
    navigate(`/search?${params.toString()}`);
    closeDropdown();
  };

  const handleKeyDown = (event) => {
    if (!isOpen || flatResults.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? flatResults.length - 1 : prev - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const active = flatResults[activeIndex];
      if (active) {
        handleResultClick(active.sectionKey, active.item);
      }
    } else if (event.key === 'Escape') {
      closeDropdown();
    }
  };

  const trimmedQuery = query.trim();

  return (
    <div className={`relative w-full ${className || ''}`} ref={containerRef}>
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400 dark:text-gray-300">
        <Icons name="deep-search" />
      </div>
      <Input
        label="Search"
        name="omnibox-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (sections.length) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        wrapperClassName="relative z-0 w-full text-left"
        inputClassName={`pt-3 pb-2 block w-full mt-0 bg-transparent border-0 border-b-2 appearance-none focus:outline-none focus:ring-0 border-gray-300 dark:border-slate-600 focus:border-gray-500 dark:focus:border-slate-400 pl-12 pr-12 text-left text-dark-gray dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-400 ${
          inputClasses || ''
        }`}
        labelClassName="absolute duration-300 top-3 left-12 -z-1 origin-0 text-gray-500 dark:text-slate-300 pointer-events-none"
      />
      {query && (
        <button
          type="button"
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
          onClick={() => {
            setQuery('');
            setSections([]);
            setIsOpen(false);
          }}
        >
          Esc
        </button>
      )}
      {isOpen && (
        <div
          className={`search-dropdown z-40 bg-white dark:bg-[#1d1f2f] ${
            isOpen ? 'active' : ''
          }`}
          style={{ width: 'min(90vw, 720px)' }}
        >
          <div className="px-7 py-5">
            {loading ? <SearchLoadingIndicator /> : null}
            {error ? <p className="text-xs text-red-500">{error}</p> : null}
            {!loading && !error && sections.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {trimmedQuery.length < MIN_SUGGEST_LENGTH
                  ? `Type at least ${MIN_SUGGEST_LENGTH} characters to search.`
                  : 'No suggestions yet. Try another term.'}
              </p>
            ) : null}
            <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto pr-1">
              {sections.map((section) => {
                const meta =
                  SECTION_METADATA[section.key] || SECTION_METADATA.default;
                const SectionIcon =
                  meta.icon && typeof meta.icon === 'function'
                    ? meta.icon
                    : SECTION_METADATA.default.icon;
                const sectionCount = section.total ?? section.results.length;
                const titleSlot = (
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.iconBg}`}
                    >
                      <SectionIcon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {meta.label}
                    </span>
                  </span>
                );
                const summarySlot = (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {sectionCount} {sectionCount === 1 ? 'result' : 'results'}
                  </span>
                );
                return (
                  <CollapsableCard
                    key={section.key}
                    fullWidth
                    isOpen={false}
                    className="search-section-card shrink-0"
                    titleSlot={titleSlot}
                    summarySlot={summarySlot}
                  >
                    <ul className="space-y-2">
                      {section.results.map((result, resultIndex) => {
                        const label = resolveResultLabel(result, resultIndex);
                        const subLabel = resolveResultSubLabel(
                          section.key,
                          result
                        );
                        const amount = resolveResultAmount(section.key, result);
                        const flattenIndex = flatResults.findIndex(
                          (entry) =>
                            entry.item === result &&
                            entry.sectionKey === section.key
                        );
                        const isActive = flattenIndex === activeIndex;
                        return (
                          <li
                            key={`${section.key}-${result.id || resultIndex}`}
                          >
                            <button
                              type="button"
                              className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-gray-200 dark:hover:bg-[#141a2b] dark:focus-visible:ring-indigo-500/40 dark:focus-visible:ring-offset-[#0d1426] ${
                                isActive ? 'bg-indigo-50 dark:bg-[#141a2b]' : ''
                              }`}
                              onMouseEnter={() => {
                                if (flattenIndex >= 0) {
                                  setActiveIndex(flattenIndex);
                                }
                              }}
                              onClick={() =>
                                handleResultClick(section.key, result)
                              }
                            >
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}
                              >
                                <SectionIcon className="h-5 w-5" />
                              </span>
                              <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                  {label}
                                </span>
                                {subLabel ? (
                                  <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                                    {subLabel}
                                  </span>
                                ) : null}
                              </span>
                              {amount ? (
                                <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                                  {amount}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsableCard>
                );
              })}
            </div>
            {sections.length > 0 && (
              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <span>Showing top matches</span>
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  pill
                  onClick={() => {
                    if (query.trim()) {
                      const params = new URLSearchParams();
                      params.set('q', query.trim());
                      params.set('source', 'omnibox');
                      navigate(`/search?${params.toString()}`);
                      closeDropdown();
                    }
                  }}
                  disabled={!query.trim()}
                >
                  See all
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

SearchCom.propTypes = {
  className: PropTypes.string,
  inputClasses: PropTypes.string
};
