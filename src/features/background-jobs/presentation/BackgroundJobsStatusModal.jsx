import React, { useMemo } from 'react';
import PopOver, { ModalBody } from '../../../components/Modal/PopOver';
import Button from '../../../components/Button/Button';
import EmptyStateBanner from '../../../components/EmptyState/EmptyStateBanner';
import { useBackgroundJobs } from './BackgroundJobsContext';
import { documentImportApi } from '../../../infrastructure/documentImport/documentImportApi';

const STATUS_PILL = {
  pending: { label: 'Queued', color: 'bg-slate-200 text-slate-700' },
  queued: { label: 'Queued', color: 'bg-slate-200 text-slate-700' },
  parsing: { label: 'Extracting', color: 'bg-amber-200 text-amber-800' },
  ready: { label: 'Ready to review', color: 'bg-emerald-200 text-emerald-800' },
  needs_review: {
    label: 'Needs review',
    color: 'bg-emerald-200 text-emerald-800'
  },
  applied: { label: 'Applied', color: 'bg-sky-200 text-sky-800' },
  failed: { label: 'Failed', color: 'bg-rose-200 text-rose-800' }
};

const TYPE_LABEL = {
  expense: 'Expenses',
  income: 'Income',
  budget: 'Budget',
  recipient: 'Recipients',
  donation: 'Donations'
};

function fmtRelative(iso) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function BackgroundJobsStatusModal() {
  const {
    isStatusModalOpen,
    closeStatusModal,
    allTrackedJobs,
    startReview,
    refresh
  } = useBackgroundJobs();

  const [retryingId, setRetryingId] = React.useState(null);
  const [retryError, setRetryError] = React.useState('');

  const handleRetry = async (jobId) => {
    setRetryingId(jobId);
    setRetryError('');
    try {
      await documentImportApi.retry(jobId);
      await refresh();
    } catch (err) {
      setRetryError(
        err?.response?.data?.error || err?.message || 'Retry failed.'
      );
    } finally {
      setRetryingId(null);
    }
  };

  const activeOrPending = useMemo(
    () =>
      allTrackedJobs.filter((j) =>
        ['pending', 'queued', 'parsing'].includes(j.status)
      ),
    [allTrackedJobs]
  );
  const readyJobs = useMemo(
    () =>
      allTrackedJobs.filter((j) =>
        ['ready', 'needs_review'].includes(j.status)
      ),
    [allTrackedJobs]
  );
  const failedJobs = useMemo(
    () => allTrackedJobs.filter((j) => j.status === 'failed'),
    [allTrackedJobs]
  );

  return (
    <PopOver show={isStatusModalOpen} setShow={closeStatusModal} size="default">
      <ModalBody>
        <div className="pt-4">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Imports in progress
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Track what's being processed, review finished imports, and retry
            anything that stalled.
          </p>

          {retryError && (
            <div className="mt-4 text-sm text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2">
              {retryError}
            </div>
          )}

          {allTrackedJobs.length === 0 && (
            <div className="mt-4">
              <EmptyStateBanner
                title="No imports in progress"
                description="Uploads you start will appear here with their progress."
              />
            </div>
          )}

          <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {[
              { title: 'In progress', items: activeOrPending },
              { title: 'Ready to review', items: readyJobs },
              { title: 'Failed', items: failedJobs }
            ]
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <section key={group.title}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                    {group.title}
                  </h3>
                  <ul className="space-y-2">
                    {group.items.map((job) => {
                      const pill = STATUS_PILL[job.status] || {
                        label: job.status,
                        color: 'bg-slate-200 text-slate-700'
                      };
                      const typeLabel =
                        TYPE_LABEL[job.import_type] || job.import_type;
                      const isRetryable = job.is_retryable;
                      const isReady = ['ready', 'needs_review'].includes(
                        job.status
                      );
                      const handleCardClick = () => {
                        if (isReady) startReview(job);
                      };
                      return (
                        <li
                          key={job.id}
                          role={isReady ? 'button' : undefined}
                          tabIndex={isReady ? 0 : undefined}
                          onClick={isReady ? handleCardClick : undefined}
                          onKeyDown={
                            isReady
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleCardClick();
                                  }
                                }
                              : undefined
                          }
                          className={`flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-white/10 ${
                            isReady
                              ? 'cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/10 transition'
                              : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-medium text-slate-900 dark:text-white truncate"
                              title={
                                job.original_filename || `Import ${job.id}`
                              }
                            >
                              {job.original_filename || `Import ${job.id}`}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${pill.color}`}
                              >
                                {pill.label}
                              </span>
                              <span>{typeLabel}</span>
                              {typeof job.row_count === 'number' &&
                                job.row_count > 0 && (
                                  <span>
                                    {job.row_count}{' '}
                                    {job.row_count === 1 ? 'row' : 'rows'}
                                  </span>
                                )}
                              <span>· {fmtRelative(job.created_at)}</span>
                              {job.retry_count > 0 && (
                                <span className="text-amber-600 dark:text-amber-400">
                                  · retried {job.retry_count}×
                                </span>
                              )}
                            </div>
                            {job.status === 'failed' && job.error_message && (
                              <div className="mt-2 text-xs text-rose-500">
                                {job.error_message}
                              </div>
                            )}
                          </div>
                          {isReady && (
                            <Button
                              variant="primary"
                              pill
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                startReview(job);
                              }}
                            >
                              Review
                            </Button>
                          )}
                          {isRetryable && (
                            <Button
                              variant="secondary"
                              pill
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetry(job.id);
                              }}
                              isLoading={retryingId === job.id}
                              loadingText="Retrying…"
                              disabled={retryingId !== null}
                            >
                              Retry
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              variant="secondary"
              pill
              size="normal"
              onClick={closeStatusModal}
            >
              Close
            </Button>
          </div>
        </div>
      </ModalBody>
    </PopOver>
  );
}
