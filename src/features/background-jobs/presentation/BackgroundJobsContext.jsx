import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { documentImportApi } from '../../../infrastructure/documentImport/documentImportApi';
import { useSeedContext } from '../../seed/presentation/SeedContext';

/**
 * Tracks background jobs across the app — document imports, media
 * processing, bulk operations, or anything that runs asynchronously
 * on the server.
 *
 * When jobs finish, sets `completedJobs` so the app can pop up a
 * review modal interrupting the user.
 */
const BackgroundJobsContext = createContext({
  hasActiveJobs: false,
  progress: 0,
  activeJobs: [],
  completedJobs: [],
  allTrackedJobs: [],
  statusSummary: '',
  isStatusModalOpen: false,
  openStatusModal: () => {},
  closeStatusModal: () => {},
  startReview: () => {},
  dismissCompleted: () => {},
  refresh: () => {},
  notifyNewJobs: () => {}
});

const POLL_INTERVAL = 4000;
const ACTIVE_STATUSES = ['pending', 'queued', 'parsing'];
const DONE_STATUSES = ['ready', 'needs_review'];
// Imports the parser abandoned (server crash, missing worker, etc.)
// stay in pending/queued/parsing forever and pin the avatar progress
// ring on for users who haven't uploaded anything in days. Treat any
// "active" job older than this as effectively dead.
const STALE_ACTIVE_AGE_MS = 30 * 60 * 1000;

const isFresh = (job) => {
  const ts =
    job?.updated_at || job?.created_at || job?.started_at || job?.created;
  if (!ts) return true;
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return true;
  return Date.now() - t < STALE_ACTIVE_AGE_MS;
};

export function BackgroundJobsProvider({ children }) {
  const [jobs, setJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const prevActiveIdsRef = useRef(new Set());
  const pollRef = useRef(null);
  // Workspaces the viewer can't read imports for (403). Poller skips them
  // so we don't hammer a forbidden endpoint every 4s on a workspace the
  // user is only supporting / doesn't belong to.
  const forbiddenWorkspacesRef = useRef(new Set());
  const { seed } = useSeedContext();
  const workspaceId = seed?.id || seed?.pk;

  const fetchJobs = useCallback(async () => {
    if (!workspaceId) return;
    const wsKey = String(workspaceId);
    if (forbiddenWorkspacesRef.current.has(wsKey)) return;
    try {
      const res = await documentImportApi.listImports({
        workspace: wsKey,
        status: 'pending,queued,parsing,ready,needs_review,failed'
      });
      const data = Array.isArray(res?.data) ? res.data : [];
      setJobs(data.map((j) => ({ ...j, jobType: 'import' })));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403 || status === 401) {
        forbiddenWorkspacesRef.current.add(wsKey);
        setJobs([]);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
      // other failures: silently drop, polling retries on next tick
    }
  }, [workspaceId]);

  const activeJobs = useMemo(
    () => jobs.filter((j) => ACTIVE_STATUSES.includes(j.status) && isFresh(j)),
    [jobs]
  );

  const readyJobs = useMemo(
    () =>
      jobs.filter(
        (j) => DONE_STATUSES.includes(j.status) && !dismissed.has(j.id)
      ),
    [jobs, dismissed]
  );

  const hasActiveJobs = activeJobs.length > 0;

  /**
   * Pick the import_type with the most-recent completed job and return
   * just the jobs of that type. Mixing types in a single review modal
   * breaks the preview table — columns differ (expense has amount/date;
   * recipient has age/gender/photo) and the modal can only render one
   * schema at a time. If the user has multiple ready types queued,
   * we show them one batch at a time.
   */
  const pickSingleTypeBatch = useCallback((candidateJobs) => {
    if (candidateJobs.length === 0) return [];
    const groups = new Map();
    for (const j of candidateJobs) {
      const type = j.import_type || 'other';
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type).push(j);
    }
    if (groups.size === 1) return candidateJobs;
    const timestampOf = (j) =>
      Date.parse(j.updated_at || j.created_at || j.queued_at || 0) || 0;
    let best = null;
    let bestTs = -Infinity;
    for (const group of groups.values()) {
      const latest = Math.max(...group.map(timestampOf));
      if (latest > bestTs) {
        bestTs = latest;
        best = group;
      }
    }
    return best || [];
  }, []);

  // Detect when ALL active jobs finish — only trigger the review
  // modal once every job in the batch is done, not as each one
  // completes individually.
  useEffect(() => {
    const hadActive = prevActiveIdsRef.current.size > 0;
    const currentActiveIds = new Set(activeJobs.map((j) => j.id));
    const nowEmpty = currentActiveIds.size === 0;

    // Transition: had active jobs → now zero active → ready jobs exist
    if (hadActive && nowEmpty && readyJobs.length > 0) {
      setCompletedJobs(pickSingleTypeBatch(readyJobs));
    }

    prevActiveIdsRef.current = currentActiveIds;
  }, [activeJobs, readyJobs, pickSingleTypeBatch]);

  // Single check on mount / workspace switch
  useEffect(() => {
    if (!workspaceId) return;
    fetchJobs();
  }, [workspaceId, fetchJobs]);

  // Poll while there are active jobs
  useEffect(() => {
    if (!hasActiveJobs) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (!pollRef.current) {
      pollRef.current = setInterval(fetchJobs, POLL_INTERVAL);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [hasActiveJobs, fetchJobs]);

  const notifyNewJobs = useCallback(() => {
    fetchJobs();
  }, [fetchJobs]);

  const progress = useMemo(() => {
    const active = jobs.filter(
      (j) => ACTIVE_STATUSES.includes(j.status) && isFresh(j)
    );
    const ready = jobs.filter(
      (j) => DONE_STATUSES.includes(j.status) && !dismissed.has(j.id)
    );
    const total = active.length + ready.length;
    if (!total) return 0;
    return Math.round((ready.length / total) * 100);
  }, [jobs, dismissed]);

  /**
   * Short human-readable summary of what the worker is currently doing —
   * intended for the tiny caption under the header progress ring so
   * users who navigated away can remember what they were importing.
   *
   * Examples:
   *   "Queued 1 expense file"
   *   "Parsing recipient file"
   *   "Reviewing 2 imports"
   */
  const statusSummary = useMemo(() => {
    const typeLabel = (t) =>
      ({
        expense: 'expense',
        income: 'income',
        budget: 'budget',
        recipient: 'recipient',
        donation: 'donation'
      }[t] || 'file');
    if (activeJobs.length > 0) {
      const dominant = activeJobs[0];
      const plural = activeJobs.length === 1 ? 'file' : 'files';
      const stageMap = {
        pending: 'Queued',
        queued: 'Queued',
        parsing: 'Extracting'
      };
      const stage = stageMap[dominant.status] || 'Processing';
      const type = typeLabel(dominant.import_type);
      if (activeJobs.length === 1) {
        return `${stage} ${type} file`;
      }
      return `${stage} ${activeJobs.length} ${plural}`;
    }
    if (readyJobs.length > 0) {
      if (readyJobs.length === 1) {
        return `Ready to review ${typeLabel(readyJobs[0].import_type)}`;
      }
      return `${readyJobs.length} imports ready`;
    }
    return '';
  }, [activeJobs, readyJobs]);

  const allTrackedJobs = useMemo(
    () =>
      jobs
        .filter((j) => !dismissed.has(j.id))
        .slice()
        .sort(
          (a, b) =>
            Date.parse(b.created_at || b.updated_at || 0) -
            Date.parse(a.created_at || a.updated_at || 0)
        ),
    [jobs, dismissed]
  );

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const openStatusModal = useCallback(() => setIsStatusModalOpen(true), []);
  const closeStatusModal = useCallback(() => setIsStatusModalOpen(false), []);

  /**
   * Manually open the review modal for a specific ready job. Used when
   * the user clicks a row in the status modal instead of waiting for
   * the automatic transition. All ready jobs of the same import type
   * are batched together — reviewing one recipient import surfaces
   * every ready recipient import at once, matching the auto flow.
   */
  const startReview = useCallback(
    (jobOrId) => {
      const targetId = typeof jobOrId === 'object' ? jobOrId?.id : jobOrId;
      if (!targetId) return;
      const target = jobs.find((j) => j.id === targetId);
      if (!target) return;
      const sameTypeReady = jobs.filter(
        (j) =>
          DONE_STATUSES.includes(j.status) &&
          j.import_type === target.import_type &&
          !dismissed.has(j.id)
      );
      setCompletedJobs(sameTypeReady.length > 0 ? sameTypeReady : [target]);
      setIsStatusModalOpen(false);
    },
    [jobs, dismissed]
  );

  const dismissCompleted = useCallback(() => {
    setCompletedJobs((prev) => {
      // Mark the current batch dismissed so it doesn't bounce back.
      if (prev.length > 0) {
        setDismissed((d) => {
          const next = new Set(d);
          prev.forEach((j) => next.add(j.id));
          return next;
        });
      }
      // Immediately surface the next single-type batch, if any. This
      // is what makes "upload a recipients CSV + an expenses CSV in the
      // same session" behave correctly — finish the recipient review,
      // dismiss, and the expense review pops up next.
      const dismissedIds = new Set(prev.map((j) => j.id));
      const stillReady = jobs.filter(
        (j) =>
          DONE_STATUSES.includes(j.status) &&
          !dismissed.has(j.id) &&
          !dismissedIds.has(j.id)
      );
      return pickSingleTypeBatch(stillReady);
    });
  }, [jobs, dismissed, pickSingleTypeBatch]);

  const value = useMemo(
    () => ({
      hasActiveJobs,
      progress,
      activeJobs,
      completedJobs,
      allTrackedJobs,
      statusSummary,
      isStatusModalOpen,
      openStatusModal,
      closeStatusModal,
      startReview,
      dismissCompleted,
      refresh: fetchJobs,
      notifyNewJobs
    }),
    [
      hasActiveJobs,
      progress,
      activeJobs,
      completedJobs,
      allTrackedJobs,
      statusSummary,
      isStatusModalOpen,
      openStatusModal,
      closeStatusModal,
      startReview,
      dismissCompleted,
      fetchJobs,
      notifyNewJobs
    ]
  );

  return (
    <BackgroundJobsContext.Provider value={value}>
      {children}
    </BackgroundJobsContext.Provider>
  );
}

export function useBackgroundJobs() {
  return useContext(BackgroundJobsContext);
}

export default BackgroundJobsContext;
