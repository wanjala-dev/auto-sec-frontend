import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import PopOver, { ModalBody } from '../../../components/Modal/PopOver';
import Button from '../../../components/Button/Button';
import Loading2 from '../../../components/Utility/LoadingSpinner/Loading';
import { useBackgroundJobs } from './BackgroundJobsContext';
import { documentImportApi } from '../../../infrastructure/documentImport/documentImportApi';
import { useSeedContext } from '../../seed/presentation/SeedContext';
import { resolveImportTypeConfig } from '../../imports/presentation/importTypeConfig';
import { BsTrash, BsPencil, BsCheck2 } from 'react-icons/bs';
import { FiCheckCircle } from 'react-icons/fi';

export default function BackgroundJobReviewModal() {
  const { completedJobs, dismissCompleted, refresh } = useBackgroundJobs();
  const { refreshTransactionData, getSeed, seed } = useSeedContext();
  const workspaceId = seed?.id || seed?.pk;

  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  // Guard against applying the same import IDs twice
  const appliedIdsRef = useRef(new Set());
  // Pending auto-proposed-budget poll, cancelled on unmount.
  const proposedBudgetPollRef = useRef(null);

  // After an expense import lands, the backend proposes a draft budget
  // on a Celery worker (≥3 months of history). That completes a few
  // seconds after apply returns, so refetch the seed on a short bounded
  // schedule until the auto_proposed budget shows up — otherwise it
  // doesn't appear until the user manually refreshes the budget page.
  const pollForProposedBudget = useCallback(
    (wsId) => {
      if (!wsId || typeof getSeed !== 'function') return;
      if (proposedBudgetPollRef.current) {
        clearTimeout(proposedBudgetPollRef.current);
        proposedBudgetPollRef.current = null;
      }
      let attempts = 0;
      const maxAttempts = 6; // ~18s headroom for the worker
      const tick = async () => {
        attempts += 1;
        let found = false;
        try {
          const updated = await getSeed(wsId, { force: true });
          const budgets = Array.isArray(updated?.budgets)
            ? updated.budgets
            : [];
          found = budgets.some((b) => b?.source === 'auto_proposed');
        } catch (_err) {
          /* transient — retry on the next tick */
        }
        if (found || attempts >= maxAttempts) {
          proposedBudgetPollRef.current = null;
          return;
        }
        proposedBudgetPollRef.current = setTimeout(tick, 3000);
      };
      proposedBudgetPollRef.current = setTimeout(tick, 3000);
    },
    [getSeed]
  );

  useEffect(
    () => () => {
      if (proposedBudgetPollRef.current) {
        clearTimeout(proposedBudgetPollRef.current);
        proposedBudgetPollRef.current = null;
      }
    },
    []
  );

  const show = completedJobs.length > 0 && !isDone;
  const importIds = useMemo(
    () =>
      completedJobs
        .map((j) => j.id)
        .filter((id) => id && !appliedIdsRef.current.has(id)),
    [completedJobs]
  );

  const importType = completedJobs[0]?.import_type || 'expense';
  const typeConfig = resolveImportTypeConfig(importType);
  const label = typeConfig.singular;
  const labelPlural = typeConfig.plural;
  const fileCount = completedJobs.length;

  // Fetch rows when completed jobs appear
  useEffect(() => {
    if (!importIds.length) return;

    let cancelled = false;
    const fetchRows = async () => {
      setIsLoading(true);
      const allRows = [];
      for (const id of importIds) {
        try {
          const res = await documentImportApi.getRows(id);
          const data = Array.isArray(res?.data) ? res.data : [];
          allRows.push(...data.map((r) => ({ ...r, _importId: id })));
        } catch {
          // skip
        }
      }
      if (!cancelled) {
        setRows(allRows);
        setIsLoading(false);
      }
    };
    fetchRows();
    return () => {
      cancelled = true;
    };
  }, [importIds]);

  const handleEditField = useCallback(async (row, field, value) => {
    if (!row._importId || !row.id) return;
    try {
      await documentImportApi.updateRow(row._importId, row.id, {
        [field]: value
      });
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, [field]: value } : r))
      );
    } catch {
      // silent
    }
  }, []);

  const handleRemoveRow = useCallback(async (row) => {
    if (!row._importId || !row.id) return;
    try {
      await documentImportApi.deleteRow(row._importId, row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch {
      // silent
    }
  }, []);

  const handleApply = useCallback(async () => {
    if (isApplying) return;
    setIsApplying(true);
    setError('');
    let total = 0;

    try {
      for (const id of importIds) {
        // Skip if already applied
        if (appliedIdsRef.current.has(id)) continue;

        try {
          const res = await documentImportApi.applyImport(id, {
            skip_invalid: true,
            create_missing_categories: true
          });
          total += res?.data?.applied_row_count || 0;
          appliedIdsRef.current.add(id);
        } catch (err) {
          const msg = err?.response?.data?.error || err?.message || '';
          // "cannot apply" means this import was already applied —
          // typically by the inline import flow that raced this modal.
          // The rows DID land, so read the real count off the import
          // instead of treating it as zero (which made the completion
          // screen claim "0 created" even though transactions exist).
          if (msg.includes('cannot apply')) {
            appliedIdsRef.current.add(id);
            try {
              const existing = await documentImportApi.getImport(id);
              total += existing?.data?.applied_row_count || 0;
            } catch {
              // best-effort — leave total as-is if the refetch fails
            }
          } else {
            setError(msg || 'Failed to apply some records.');
          }
        }
      }

      setAppliedCount(total);
      setIsDone(true);

      // Refresh data so tables update. Failures here must NOT block the
      // "Import complete" transition — the apply already succeeded on
      // the server, a stale client cache is a minor nit.
      if (workspaceId) {
        try {
          refreshTransactionData(workspaceId).catch(() => {});
        } catch {
          // swallow synchronous throws too
        }
        try {
          getSeed(workspaceId).catch(() => {});
        } catch {
          // swallow
        }
        // Expense imports kick off the auto-budget proposal on a Celery
        // worker a few seconds after apply returns. A single getSeed
        // above fires too early to catch it, so poll the seed on a
        // short bounded schedule until the proposed budget surfaces.
        if (importType === 'expense' && total > 0) {
          pollForProposedBudget(workspaceId);
        }
      }
    } finally {
      // Always release the spinner — even if a downstream setter threw,
      // the user must never see "Saving..." stuck forever.
      setIsApplying(false);
    }
  }, [
    importIds,
    isApplying,
    workspaceId,
    importType,
    refreshTransactionData,
    getSeed,
    pollForProposedBudget
  ]);

  const handleClose = useCallback(() => {
    dismissCompleted();
    setRows([]);
    setIsDone(false);
    setAppliedCount(0);
    setError('');
    setEditingId(null);
    refresh();
  }, [dismissCompleted, refresh]);

  const totalRows = rows.filter((r) => r.is_valid !== false).length;

  return (
    <PopOver show={show || isDone} setShow={() => handleClose()}>
      <ModalBody>
        <div className="mt-4 max-h-[80vh] overflow-y-auto">
          {isDone ? (
            <div className="space-y-6 text-center py-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <FiCheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Import complete
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-300">
                {appliedCount} {appliedCount === 1 ? label : labelPlural}{' '}
                created successfully.
              </p>
              {error && <p className="text-sm text-rose-500">{error}</p>}
              <Button
                variant="primary"
                pill
                size="normal"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loading2 />
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Loading extracted records...
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                  <FiCheckCircle className="h-3.5 w-3.5" />
                  Processing complete
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  Review your {labelPlural}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  {totalRows} {totalRows === 1 ? label : labelPlural} extracted
                  from {fileCount} file{fileCount !== 1 ? 's' : ''}. Edit or
                  remove rows before saving.
                </p>
              </div>

              {error && <p className="text-sm text-rose-500">{error}</p>}

              {/* Preview table — columns come from the shared import
                  type config so recipient / budget / expense / etc. each
                  render their own shape without duplicating markup. */}
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5 text-left">
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        #
                      </th>
                      {typeConfig.previewColumns.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          {col.header}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={typeConfig.previewColumns.length + 2}
                          className="px-3 py-8 text-center text-gray-400"
                        >
                          No rows extracted.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, vi) => {
                        const isEditing =
                          typeConfig.editable && editingId === row.id;
                        return (
                          <tr
                            key={row.id}
                            className="border-t border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                          >
                            <td className="px-3 py-2 text-gray-400 text-xs">
                              {vi + 1}
                            </td>
                            {typeConfig.previewColumns.map((col) => {
                              const readOnly =
                                col.readOnly || !typeConfig.editable;
                              const value = readOnly
                                ? col.read
                                  ? col.read(row)
                                  : String(row?.[col.field] ?? '') || '—'
                                : row?.[col.field];
                              if (!readOnly && isEditing) {
                                return (
                                  <td key={col.key} className="px-3 py-2">
                                    <input
                                      className={`${
                                        col.width || 'w-full'
                                      } rounded border border-gray-300 dark:border-white/20 bg-transparent px-2 py-1 text-sm dark:text-white`}
                                      type={col.editType || 'text'}
                                      step={
                                        col.editType === 'number'
                                          ? '0.01'
                                          : undefined
                                      }
                                      defaultValue={value ?? ''}
                                      onBlur={(e) =>
                                        handleEditField(
                                          row,
                                          col.field,
                                          e.target.value
                                        )
                                      }
                                    />
                                  </td>
                                );
                              }
                              return (
                                <td
                                  key={col.key}
                                  className="px-3 py-2 text-gray-700 dark:text-gray-200"
                                >
                                  {value || '—'}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {typeConfig.editable && (
                                  <button
                                    type="button"
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600"
                                    onClick={() =>
                                      setEditingId(isEditing ? null : row.id)
                                    }
                                  >
                                    {isEditing ? (
                                      <BsCheck2 size={14} />
                                    ) : (
                                      <BsPencil size={14} />
                                    )}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-rose-500"
                                  onClick={() => handleRemoveRow(row)}
                                >
                                  <BsTrash size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  pill
                  size="normal"
                  onClick={handleClose}
                  disabled={isApplying}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  pill
                  size="normal"
                  onClick={handleApply}
                  disabled={rows.length === 0 || isApplying}
                  isLoading={isApplying}
                  loadingText="Saving..."
                >
                  <span className="uppercase">
                    Save {totalRows} {totalRows === 1 ? label : labelPlural}
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </ModalBody>
    </PopOver>
  );
}
