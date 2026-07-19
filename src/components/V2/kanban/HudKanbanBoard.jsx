import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import HudText from '../HudText';
import HexLoader from '../HexLoader';
import HudCard from '../HudCard';
import HudSelect from '../HudSelect';
import HudInput from '../HudInput';
import RestrictedArea from '../RestrictedArea';
import { useKanbanBoardContext } from '../../../features/kanban/presentation/KanbanBoardContext';
import { useSeedContext } from '../../../features/seed/presentation/SeedContext';
import {
  getColumnDndId,
  getTaskColumnId,
  getTaskSortableId
} from './taskSortableId';

/* ── Fallback lanes so the board always reads as a board (SOC-flavored). Used
   when no real board/columns exist yet; the triage agent's findings land in the
   real columns once a SOC team + board are connected. ── */
const DEFAULT_COLUMNS = [
  { id: '__todo', title: 'To Do', order: 0 },
  { id: '__triaging', title: 'Triaging', order: 1 },
  { id: '__in_progress', title: 'In Progress', order: 2 },
  { id: '__resolved', title: 'Resolved', order: 3 }
];

/* ── Per-lane accent — cycles by column position, HUD neon palette ── */
const LANE_ACCENTS = ['#2EDBE8', '#F59E0B', '#8B5CF6', '#E84D8A', '#34d399'];
const laneAccent = (i) => LANE_ACCENTS[i % LANE_ACCENTS.length];

/* ── Severity heuristic — read from the task title prefix the triage agent
   writes ("[HIGH] …") or an explicit priority/severity field. ── */
const SEVERITY_STYLES = {
  critical: { c: '#ff3b52', label: 'CRIT' },
  high: { c: '#E84D8A', label: 'HIGH' },
  medium: { c: '#F59E0B', label: 'MED' },
  low: { c: '#2EDBE8', label: 'LOW' }
};

const resolveSeverity = (task) => {
  const raw = (
    task?.severity ||
    task?.priority ||
    (task?.title || '').match(/\[(critical|high|medium|low)\]/i)?.[1] ||
    ''
  )
    .toString()
    .toLowerCase();
  return SEVERITY_STYLES[raw] || null;
};

const initials = (user) => {
  const f = (user?.first_name || '').trim();
  const l = (user?.last_name || '').trim();
  const combined = `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  if (combined) return combined;
  const name = (user?.name || user?.username || user?.email || '?').toString();
  return name.charAt(0).toUpperCase();
};

/* ── Assignee avatar stack — maps directly to the SOC team member(s) a
   finding is assigned to. This is the payoff of "triage agent → assign to
   member": the operator sees who owns the alert. ── */
function AssigneeStack({ assignees }) {
  if (!assignees || assignees.length === 0) {
    return (
      <span className="text-[7px] font-mono text-hud-dim tracking-wider">
        UNASSIGNED
      </span>
    );
  }
  return (
    <div className="flex items-center -space-x-1.5">
      {assignees.slice(0, 4).map((u, i) => (
        <div
          key={u?.id ?? i}
          title={`${u?.first_name || ''} ${u?.last_name || ''}`.trim() || 'Assignee'}
          className="h-5 w-5 rounded-full border border-hud-line/30 bg-hud-surface-2 flex items-center justify-center overflow-hidden"
          style={{ boxShadow: '0 0 6px rgba(46,219,232,0.15)' }}
        >
          {u?.avatar ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={u.avatar} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[7px] font-mono font-bold text-hud-accent">
              {initials(u)}
            </span>
          )}
        </div>
      ))}
      {assignees.length > 4 && (
        <div className="h-5 w-5 rounded-full border border-hud-line/20 bg-hud-surface-2 flex items-center justify-center">
          <span className="text-[7px] font-mono text-hud-dim">
            +{assignees.length - 4}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── One task card — HUD chrome, dnd-sortable. Satisfies the shared kanban
   drag hook's contract: data.type === 'Task', data.column === owning column. ── */
function HudTaskCard({ task, columnId, accent, dragging }) {
  const sortableId = getTaskSortableId(task, columnId);
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: sortableId,
    data: { type: 'Task', task, column: columnId }
  });

  const severity = resolveSeverity(task);
  const lw = task?.log_watch || null;
  // Optimization findings share the log_watch envelope but carry a `kind`
  // (periodic_task / health_check / volume) and frequency data instead of an
  // error level. `error` (or absent) = a triage finding.
  const isOpt = !!(lw && lw.kind && lw.kind !== 'error');
  const prov = task?.provenance || null;
  const [expanded, setExpanded] = useState(false);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  // While this card is the one being dragged, its in-list slot becomes a clear
  // dashed drop-zone that follows the cursor across columns (onDragOver
  // relocates the task live), so the operator sees exactly where it will land.
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="min-h-[48px] border border-dashed border-hud-accent/60 bg-cyan-500/[0.07]"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative cursor-grab active:cursor-grabbing border bg-hud-surface/90 px-3 py-2.5 transition ${
        dragging
          ? 'border-hud-accent/60 shadow-[0_0_18px_rgba(46,219,232,0.35)]'
          : 'border-hud-line/10 hover:border-hud-line/30 hover:bg-cyan-500/[0.03]'
      }`}
    >
      {/* left accent bar */}
      <span
        className="absolute left-0 top-0 h-full w-[2px]"
        style={{ background: accent, opacity: 0.55 }}
      />
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <HudText
          variant="bodySmall"
          color="light"
          className="leading-snug line-clamp-2"
        >
          {task?.title || 'Untitled finding'}
        </HudText>
        {severity && (
          <span
            className="shrink-0 text-[7px] font-mono font-bold tracking-wider px-1.5 py-0.5 border"
            style={{
              color: severity.c,
              borderColor: `${severity.c}55`,
              background: `${severity.c}11`
            }}
          >
            {severity.label}
          </span>
        )}
      </div>
      {/* Grounded-verifier flag: the agent's suggestion couldn't be grounded in
          the finding's evidence, so it was downgraded and needs a human eye. */}
      {lw?.needs_human && (
        <div className="mb-1">
          <span className="inline-flex items-center gap-1 border border-amber-400/50 bg-amber-400/10 px-1.5 py-0.5 text-[7px] font-mono font-bold tracking-wider text-amber-300">
            ⚠ NEEDS HUMAN
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <AssigneeStack assignees={task?.assigned_to} />
        {task?.due_date && (
          <span className="text-[7px] font-mono text-hud-dim">
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Evidence-contract affordance — on any Log-Watch finding. Shows the
          deterministic evidence at detection time (signal / evidence / blast
          radius / confidence); the triage agent's grounded fix appears once it
          has run. The toggle stops pointer propagation so it never starts a
          drag. */}
      {lw && (lw.signal || lw.suggested_fix || (lw.evidence && lw.evidence.length > 0)) && (
        <>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="mt-2 flex w-full items-center gap-1 border-t border-hud-line/10 pt-1.5 text-[7px] font-mono tracking-wider text-hud-accent/80 transition hover:text-hud-accent"
          >
            <span>{expanded ? '▾' : '▸'}</span>
            <span>
              {isOpt
                ? lw.recommendation
                  ? 'PATTERN · REC'
                  : 'PATTERN · EVIDENCE'
                : lw.suggested_fix
                  ? 'FINDING · FIX'
                  : 'FINDING · EVIDENCE'}
            </span>
            {lw.confidence && (
              <span className="ml-auto text-hud-dim">{lw.confidence.toUpperCase()}</span>
            )}
          </button>
          {expanded && (
            <div className="mt-1.5 space-y-1.5">
              {/* Deterministic evidence (present from detection) */}
              <div className="border-l-2 border-hud-line/30 pl-2">
                {lw.signal && (
                  <p className="text-[8px] font-mono leading-[1.5] text-hud-text/80">
                    {lw.signal}
                  </p>
                )}
                {Array.isArray(lw.evidence) && lw.evidence.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {lw.evidence.slice(0, 3).map((ev, i) => (
                      <li key={i} className="truncate text-[7px] font-mono text-hud-dim">
                        <span className="text-hud-accent/60">{ev.type}:</span>{' '}
                        {String(ev.detail).slice(0, 90)}
                      </li>
                    ))}
                  </ul>
                )}
                {/* Optimization findings carry frequency instead of a level. */}
                {isOpt && lw.frequency && lw.frequency.last_window != null && (
                  <p className="mt-1 text-[7px] font-mono text-hud-dim">
                    freq: {lw.subject || lw.service} · {lw.frequency.last_window}×/window · seen{' '}
                    {lw.frequency.runs_observed || 1} run{lw.frequency.runs_observed === 1 ? '' : 's'}
                  </p>
                )}
                {!isOpt && lw.blast_radius && lw.blast_radius.window_records != null && (
                  <p className="mt-1 text-[7px] font-mono text-hud-dim">
                    blast: {lw.blast_radius.service} · {lw.blast_radius.window_records} records in window
                  </p>
                )}
              </div>
              {/* Agent output (present once the acting specialist has run) */}
              {(lw.probable_cause || lw.suggested_fix || lw.recommendation) && (
                <div className="border-l-2 border-emerald-400/40 pl-2">
                  {lw.probable_cause && (
                    <div>
                      <p className="text-[6.5px] font-mono uppercase tracking-wider text-hud-dim">
                        {isOpt ? 'Assessment' : 'Probable cause'}
                      </p>
                      <p className="text-[8px] font-mono leading-[1.5] text-hud-text/80">
                        {lw.probable_cause}
                      </p>
                    </div>
                  )}
                  {(lw.recommendation || lw.suggested_fix) && (
                    <div className="mt-1">
                      <p className="text-[6.5px] font-mono uppercase tracking-wider text-emerald-400/80">
                        {isOpt ? 'Recommendation' : 'Suggested fix'}
                      </p>
                      <p className="text-[8px] font-mono leading-[1.5] text-hud-text/90">
                        {lw.recommendation || lw.suggested_fix}
                      </p>
                    </div>
                  )}
                  {isOpt && lw.resource_win && (
                    <p className="mt-1 text-[7px] font-mono text-emerald-300/70">
                      win: {lw.resource_win}
                    </p>
                  )}
                </div>
              )}
              {/* Awaiting-agent hint when the specialist hasn't run yet */}
              {!lw.suggested_fix && !lw.recommendation && lw.triage_status === 'pending' && (
                <p className="text-[7px] font-mono italic text-hud-dim/70">
                  {isOpt
                    ? 'awaiting analysis — the optimization agent will recommend a change'
                    : 'awaiting triage — the triage agent will propose a fix'}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Provenance strip — WHO filed this card and WHO acted, on any agent-filed
          task. The audit trail the operator can trust. */}
      {prov && (prov.detector || prov.assigned_specialist) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-hud-line/10 pt-1.5 text-[6.5px] font-mono text-hud-dim/80">
          {prov.detector && (
            <span>
              <span className="text-hud-accent/50">filed by</span> {prov.detector}
            </span>
          )}
          {prov.last_handled_by ? (
            <span>
              · <span className="text-hud-accent/50">handled by</span> {prov.last_handled_by}
            </span>
          ) : (
            prov.assigned_specialist && (
              <span>
                · <span className="text-hud-accent/50">→</span> {prov.assigned_specialist}
              </span>
            )
          )}
          {prov.created_at && (
            <span className="ml-auto text-hud-dim/50">
              {new Date(prov.created_at).toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── One lane (column) — HUD panel, droppable, holds a SortableContext. ── */
function HudLane({ column, index, tasks, onAddTask }) {
  const accent = laneAccent(index);
  const columnTasks = useMemo(
    () =>
      tasks.filter(
        (t) => String(getTaskColumnId(t)) === String(column.id)
      ),
    [tasks, column.id]
  );

  const { setNodeRef } = useSortable({
    id: getColumnDndId(column.id),
    data: { type: 'Column', column }
  });

  const sortableItems = useMemo(
    () => columnTasks.map((t) => getTaskSortableId(t, column.id)),
    [columnTasks, column.id]
  );

  // Inline "add task" composer at the foot of the lane.
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const submitTask = useCallback(async () => {
    const title = draftTitle.trim();
    setAdding(false);
    setDraftTitle('');
    if (title && onAddTask) await onAddTask(column.id, title);
  }, [draftTitle, onAddTask, column.id]);

  return (
    <HudCard
      chamfer={12}
      border="cyan"
      surface="bg-hud-surface/70 backdrop-blur-sm"
      bodyClassName="flex h-full flex-col p-0"
      className="h-full min-w-0 flex-1"
    >
      {/* lane header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: `${accent}22` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rotate-45"
            style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
          />
          <HudText variant="heading" color="light">
            {column.title}
          </HudText>
        </div>
        <span
          className="text-[8px] font-mono font-bold tabular-nums px-1.5 py-0.5"
          style={{ color: accent }}
        >
          {columnTasks.length}
        </span>
      </div>
      {/* lane body */}
      <div
        ref={setNodeRef}
        className="flex-1 min-h-[80px] overflow-y-auto cc-scrollbar p-2 space-y-2"
      >
        <SortableContext
          items={sortableItems}
          strategy={verticalListSortingStrategy}
        >
          {columnTasks.map((task) => (
            <HudTaskCard
              key={getTaskSortableId(task, column.id)}
              task={task}
              columnId={column.id}
              accent={accent}
            />
          ))}
        </SortableContext>
        {columnTasks.length === 0 && (
          <div className="flex items-center justify-center h-16">
            <span className="text-[8px] font-mono text-hud-dim tracking-wider">
              — EMPTY —
            </span>
          </div>
        )}
      </div>
      {/* add-task footer */}
      {onAddTask && (
        <div
          className="border-t px-2 py-1.5"
          style={{ borderColor: `${accent}18` }}
        >
          {adding ? (
            <HudInput
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitTask();
                if (e.key === 'Escape') {
                  setAdding(false);
                  setDraftTitle('');
                }
              }}
              onBlur={submitTask}
              placeholder="New finding…"
              className="px-2 py-1"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-1 px-1 py-0.5 font-mono text-[9px] tracking-wider text-hud-dim transition hover:text-hud-accent"
            >
              <span className="text-[11px] leading-none">+</span> ADD TASK
            </button>
          )}
        </div>
      )}
    </HudCard>
  );
}

/**
 * HudKanbanBoard — the SOC triage board. Reuses the V2 HUD design system
 * (HudText/HudButton/HexLoader) and consumes the already-present shared
 * KanbanBoardContext (columns, tasks, drag handlers) + SeedContext (active
 * workspace + teams). This is the surface the security triage agent assigns
 * findings into: each card maps to a team member via `assigned_to`.
 *
 * Props:
 *   seedId  — active workspace id (resolved by the command center page)
 */
export default function HudKanbanBoard({ seedId }) {
  const {
    columns = [],
    tasks = [],
    fetchColumns,
    createColumn,
    createTask,
    getProjectsBySeedAndTeam,
    onDragStart,
    onDragEnd,
    onDragOver
  } = useKanbanBoardContext();
  const { seed, teams = [], getTeamsBySeed } = useSeedContext();

  const resolvedSeedId = seedId || seed?.id || seed?.pk || null;

  // Load the workspace's teams as soon as a workspace resolves — this surface
  // is opened directly by operators/agents, so it can't assume another page
  // already populated SeedContext.teams.
  const teamsLoadedRef = useRef(null);
  useEffect(() => {
    if (!resolvedSeedId || !getTeamsBySeed) return;
    if (teamsLoadedRef.current === resolvedSeedId) return;
    teamsLoadedRef.current = resolvedSeedId;
    Promise.resolve(getTeamsBySeed(resolvedSeedId)).catch(() => {});
  }, [resolvedSeedId, getTeamsBySeed]);

  const [teamId, setTeamId] = useState(null);
  // null projectId = the team's *default* board (project-less columns).
  // A truthy projectId narrows the board to that project's own columns/tasks.
  const [projectId, setProjectId] = useState(null);
  const [teamProjects, setTeamProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  // Width of the card being dragged, so the DragOverlay matches the real card
  // instead of a fixed narrow pill.
  const [activeWidth, setActiveWidth] = useState(null);
  const loadedRef = useRef(null);

  // Default to the workspace's DEFAULT team (where agents + the log-watch
  // detector file findings), falling back to the first. Defaulting to
  // teams[0] made the board open on an alphabetical-first team ("Agents")
  // while findings landed on "General" — a 0-findings board that lied.
  useEffect(() => {
    if (!teamId && teams.length > 0) {
      const home = teams.find((t) => t?.is_default) || teams[0];
      setTeamId(home?.id ?? home?.pk ?? null);
    }
  }, [teams, teamId]);

  // Load the selected team's projects so the operator can drill from the team
  // board into a per-project board. Switching team resets to the team board.
  useEffect(() => {
    if (!teamId || !resolvedSeedId || !getProjectsBySeedAndTeam) {
      setTeamProjects([]);
      return;
    }
    let cancelled = false;
    setProjectId(null);
    Promise.resolve(getProjectsBySeedAndTeam(resolvedSeedId, teamId))
      .then((list) => {
        if (!cancelled) setTeamProjects(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setTeamProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, resolvedSeedId, getProjectsBySeedAndTeam]);

  useEffect(() => {
    const key = `${teamId}-${resolvedSeedId}-${projectId ?? 'team'}`;
    if (!teamId || !resolvedSeedId || loadedRef.current === key) return;
    loadedRef.current = key;
    setLoading(true);
    Promise.resolve(
      fetchColumns?.(teamId, resolvedSeedId, { projectId })
    ).finally(() => setLoading(false));
  }, [teamId, resolvedSeedId, projectId, fetchColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const sortedColumns = useMemo(() => {
    const real = [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return real.length ? real : DEFAULT_COLUMNS;
  }, [columns]);

  // "Add column" affordance at the end of the board (mirrors literacyseed).
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const submitNewColumn = useCallback(async () => {
    const title = newColumnTitle.trim();
    if (!title || !teamId || !resolvedSeedId) {
      setAddingColumn(false);
      setNewColumnTitle('');
      return;
    }
    try {
      await createColumn?.(
        teamId,
        resolvedSeedId,
        title,
        sortedColumns.length,
        projectId
      );
      await fetchColumns?.(teamId, resolvedSeedId, { projectId, force: true });
    } finally {
      setAddingColumn(false);
      setNewColumnTitle('');
    }
  }, [
    newColumnTitle,
    teamId,
    resolvedSeedId,
    projectId,
    createColumn,
    fetchColumns,
    sortedColumns.length
  ]);

  // Create a finding/task directly in a lane. The backend derives team +
  // project from the column, so we only pass workspace + column + title.
  const handleAddTask = useCallback(
    async (columnId, title) => {
      const clean = (title || '').trim();
      if (!clean || !resolvedSeedId || !createTask) return;
      await createTask(resolvedSeedId, columnId, clean);
    },
    [resolvedSeedId, createTask]
  );

  const handleDragStart = useCallback(
    (event) => {
      const t = event?.active?.data?.current?.task;
      if (t) setActiveTask(t);
      // Capture the source card's rendered width so the overlay matches it.
      const w = event?.active?.rect?.current?.initial?.width;
      if (w) setActiveWidth(w);
      onDragStart?.(event);
    },
    [onDragStart]
  );

  const handleDragEnd = useCallback(
    (event) => {
      setActiveTask(null);
      setActiveWidth(null);
      onDragEnd?.(event);
    },
    [onDragEnd]
  );

  if (loading && columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <HexLoader size={64} />
        <HudText variant="caption" color="cyan-muted">
          LOADING TRIAGE BOARD…
        </HudText>
      </div>
    );
  }

  if (!resolvedSeedId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <RestrictedArea
          variant="info"
          title="TRIAGE BOARD"
          subtitle="NO WORKSPACE SELECTED"
          message="Select a workspace to view its SOC triage board."
        />
      </div>
    );
  }

  // No real board/team yet → the board still renders with DEFAULT_COLUMNS
  // (empty lanes) so it always reads as a board, instead of a bare message.
  return (
    <div className="flex flex-col h-full">
      {/* board toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <HudText variant="label" color="cyan-muted">
            SOC TRIAGE BOARD
          </HudText>
          <span className="text-[8px] font-mono text-hud-dim">
            {tasks.length} FINDING{tasks.length === 1 ? '' : 'S'}
          </span>
        </div>
        {/* Board switcher — Team (primary) → Project (secondary). Operators and
            AI agents pick which board they're viewing/managing. */}
        <div className="flex items-center gap-4">
          {teams.length > 1 && (
            <HudSelect
              label="Team"
              value={teamId ?? ''}
              onChange={(v) => {
                loadedRef.current = null;
                setTeamId(v);
              }}
              options={teams.map((tm) => ({
                value: tm.id ?? tm.pk,
                label: tm.name || tm.title || `Team ${tm.id ?? tm.pk}`
              }))}
            />
          )}
          {teamProjects.length > 0 && (
            <HudSelect
              label="Board"
              value={projectId ?? ''}
              onChange={(v) => {
                loadedRef.current = null;
                setProjectId(v || null);
              }}
              options={[
                { value: '', label: 'Team board' },
                ...teamProjects.map((pj) => {
                  const pid = pj.id ?? pj.pk ?? pj.uuid;
                  return {
                    value: pid,
                    label: pj.title || pj.name || `Project ${pid}`
                  };
                })
              ]}
            />
          )}
        </div>
      </div>

      {/* lanes */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={onDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-3 overflow-x-auto cc-scrollbar pb-2">
          {sortedColumns.map((column, i) => (
            <HudLane
              key={column.id}
              column={column}
              index={i}
              tasks={tasks}
              onAddTask={
                // Default (placeholder) lanes have string ids like "__todo"
                // and no backing row, so they can't accept a task yet.
                String(column.id).startsWith('__') ? null : handleAddTask
              }
            />
          ))}
          {/* Add-column affordance at the end of the board */}
          <div className="flex w-[210px] shrink-0 flex-col">
            {addingColumn ? (
              <div
                className="border border-dashed border-hud-line/25 bg-hud-surface/40 p-2"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)'
                }}
              >
                <HudInput
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitNewColumn();
                    if (e.key === 'Escape') {
                      setAddingColumn(false);
                      setNewColumnTitle('');
                    }
                  }}
                  onBlur={submitNewColumn}
                  placeholder="Column title…"
                  className="px-2 py-1.5"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingColumn(true)}
                title={
                  teamId
                    ? 'Add a column'
                    : 'Connect a SOC team to add columns'
                }
                className="flex h-full min-h-[80px] w-full items-center justify-center border border-dashed border-hud-line/20 bg-hud-surface/30 font-mono text-[11px] text-hud-dim transition hover:border-hud-accent/40 hover:bg-cyan-500/[0.04] hover:text-hud-accent"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)'
                }}
              >
                + Add Column
              </button>
            )}
          </div>
        </div>
        <DragOverlay>
          {activeTask ? (
            <div
              style={activeWidth ? { width: activeWidth } : undefined}
              className="relative cursor-grabbing border border-hud-accent/60 bg-hud-surface px-3 py-2.5 shadow-[0_0_24px_rgba(46,219,232,0.4)]"
            >
              {(() => {
                const sev = resolveSeverity(activeTask);
                return (
                  <>
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <HudText
                        variant="bodySmall"
                        color="white"
                        className="leading-snug line-clamp-2"
                      >
                        {activeTask?.title || 'Untitled finding'}
                      </HudText>
                      {sev && (
                        <span
                          className="shrink-0 border px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-wider"
                          style={{
                            color: sev.c,
                            borderColor: `${sev.c}55`,
                            background: `${sev.c}11`
                          }}
                        >
                          {sev.label}
                        </span>
                      )}
                    </div>
                    <AssigneeStack assignees={activeTask?.assigned_to} />
                  </>
                );
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
