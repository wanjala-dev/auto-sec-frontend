import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DndContext, useDraggable } from '@dnd-kit/core';
import { useSeedContext } from '../../../seed/presentation/SeedContext';
import { useKanbanBoardContext } from '../../../kanban/presentation/KanbanBoardContext';
import { useAuthContext } from '../../../auth/presentation/LoginAuthContext';
import { useAgentContext } from '../AgentContext';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../../domain/workspace/workspaceId';
import {
  resolveStoredSummaryWorkspaceId,
  resolveStoredSummaryWorkspaceName
} from '../../../../domain/auth/storedSummarySelectors';
import { toLinuxRoleLabel } from '../../../../domain/identity/roleDisplay';
import { readViewerStoredUserSummary } from '../../../auth/presentation/browserAuthSessionSupport';
import PredictableMoneyFlow from '../../../../components/Chart/PredictableMoneyFlow';
import HexEyeLogo from '../../../../components/V2/HexEyeLogo';
import OceanBackground from '../../../../components/Utility/OceanScene/OceanBackground';
import RestrictedArea from '../../../../components/V2/RestrictedArea';
import HudButton from '../../../../components/V2/HudButton';
import HudSearch from '../../../../components/V2/HudSearch';
import HudVoiceModal from '../../../../components/V2/HudVoiceModal';
import MobileGate from '../../../../components/V2/MobileGate';
import HudNavDrawer from '../../../../components/V2/HudNavDrawer';
import HudSideNav from '../../../../components/V2/HudSideNav';
import HudPaymentCard from '../../../../components/V2/HudPaymentCard';
import HudPromptQualityPanel from '../../../../components/V2/HudPromptQualityPanel';
import HudKanbanBoard from '../../../../components/V2/kanban/HudKanbanBoard';
import SettingsPanel from '../../../settings/presentation/SettingsPanel';
import HudMessagingPanel from '../../../messaging/presentation/HudMessagingPanel';
import HudSocialPanel from '../../../social/presentation/HudSocialPanel';
import HudWorkflowsPanel from '../../../workflow/presentation/HudWorkflowsPanel';
import HudDraftStudio from '../../../writing/presentation/HudDraftStudio';
import HudLogStreamContent from '../../../integrations/presentation/HudLogStreamContent';
import useTemplatesTree from '../../../templates/presentation/useTemplatesTree';
import OnboardingPage from '../../../onboarding/presentation/pages/OnboardingPage';
import { useOnboardingStatus } from '../../../onboarding/presentation/useOnboardingStatus';
import useSpeechToText from '../../../../hooks/useSpeechToText';
import HudChatPanel from '../../../../components/V2/HudChatPanel';
import useChatSession from '../../../ai-chat/presentation/useChatSession';
// V2 extracted components available at src/components/V2/ for reuse:
// HudPanel, StarField, DraggablePanel, CoreCanvas, FileTree, v2Constants
// (inline copies kept in this file for now — will migrate in future cleanup)
import {
  CONTEXT_ITEMS,
  CONTEXT_HEX_NODES,
  CONTEXT_HEX_CLICK_MAP,
  CONTEXT_LABELS,
  CONTEXT_PANELS,
  FILE_HEX_FOLDER_MAP
} from '../../../../components/V2/v2Constants';
import SlideInHexPanel from '../../../../components/V2/SlideInHexPanel';
import CalloutLine from '../../../../components/V2/CalloutLine';
import { motion, AnimatePresence } from 'framer-motion';
import { unifiedDocumentsApi } from '../../../../infrastructure/documentImport/unifiedDocumentsApi';
import { receiptsApi } from '../../../../infrastructure/receipts/receiptsApi';
import { agentsApi } from '../../../../infrastructure/agents/agentsApi';
import HudCheckbox from '../../../../components/V2/HudCheckbox';
import { toast } from 'react-toastify';
import '../../../../components/V2/HudToast.css';
import { useViewerSession } from '../../../auth/presentation/useViewerSession';
import {
  resolveStoredUsername,
  resolveStoredUserDisplayLabel
} from '../../../../domain/auth/storedUserSelectors';
import {
  FiArrowLeft,
  FiX,
  FiSend,
  FiTrash2,
  FiMove,
  FiFolder,
  FiFileText,
  FiGrid,
  FiPlus,
  FiChevronRight,
  FiChevronDown,
  FiMic,
  FiLogOut
} from 'react-icons/fi';

/* ── Demo data ── */
const STATUS_COLORS = {
  running: '#34d399',
  active: '#2EDBE8',
  pending: '#F59E0B',
  completed: '#8B5CF6',
  idle: '#6B7280',
  queued: '#F97316',
  failed: '#f87171'
};
const AGENTS = [
  { id: 'fin', label: 'Log Intel', status: 'running', icon: '≡', tasks: 142 },
  { id: 'don', label: 'Threat Hunt', status: 'active', icon: '⌖', tasks: 89 },
  { id: 'spo', label: 'Recon', status: 'running', icon: '★', tasks: 67 },
  { id: 'tsk', label: 'Triage', status: 'completed', icon: '✓', tasks: 234 },
  { id: 'prj', label: 'Investigate', status: 'pending', icon: '◆', tasks: 56 },
  { id: 'evt', label: 'Alerts', status: 'active', icon: '⚡', tasks: 38 },
  { id: 'anom', label: 'Anomalies', status: 'pending', icon: '◭', tasks: 17 },
  { id: 'rpt', label: 'Detections', status: 'running', icon: '▤', tasks: 71 },
  { id: 'com', label: 'Comms', status: 'queued', icon: '◎', tasks: 23 },
  { id: 'wrk', label: 'Playbooks', status: 'running', icon: '⟐', tasks: 95 },
  { id: 'mkt', label: 'Intel Feeds', status: 'idle', icon: '◫', tasks: 12 }
];
const ACTIONS = [
  {
    id: 1,
    title: 'Correlation rule matched — SSH brute force',
    status: 'completed',
    agent: 'Log Intel',
    time: '2m'
  },
  {
    id: 2,
    title: 'IOC enrichment completed',
    status: 'completed',
    agent: 'Threat Hunt',
    time: '5m'
  },
  {
    id: 3,
    title: 'External attack-surface recon sweep',
    status: 'running',
    agent: 'Recon',
    time: '8m'
  },
  {
    id: 4,
    title: 'Alert triaged — auth-svc 5xx spike',
    status: 'completed',
    agent: 'Triage',
    time: '12m'
  },
  {
    id: 5,
    title: 'Anomaly flagged — data-exfil pattern',
    status: 'running',
    agent: 'Log Intel',
    time: '15m'
  },
  {
    id: 6,
    title: 'Lateral-movement hunt',
    status: 'running',
    agent: 'Threat Hunt',
    time: '18m'
  },
  {
    id: 7,
    title: 'Investigation updated — SEC-4471',
    status: 'completed',
    agent: 'Investigate',
    time: '22m'
  },
  {
    id: 8,
    title: 'Detection report dispatched',
    status: 'completed',
    agent: 'Detections',
    time: '30m'
  },
  {
    id: 9,
    title: 'CloudWatch alert stream ingested',
    status: 'running',
    agent: 'Alerts',
    time: '35m'
  },
  {
    id: 10,
    title: 'Containment playbook executed',
    status: 'pending',
    agent: 'Playbooks',
    time: '40m'
  }
];
const TELEM = {
  income: '1,284',
  expenses: '312',
  net: '18',
  donations: 47,
  campaigns: 6,
  recipients: 23,
  teams: 4,
  budgets: 3,
  uptime: '99.7%',
  latency: '42ms',
  throughput: '1,247/hr',
  errors: 2
};

// All panels that can be opened
const PANELS = [
  { id: 'donations', label: 'THREAT HUNT', icon: '⌖' },
  { id: 'campaigns', label: 'OPERATIONS', icon: '◎' },
  { id: 'events', label: 'ALERTS', icon: '⚡' },
  { id: 'sponsorship', label: 'RECON', icon: '★' },
  { id: 'budget', label: 'LOG INTEL', icon: '≡' },
  { id: 'teams', label: 'SOC TEAM', icon: '⟐' },
  { id: 'tasks', label: 'TRIAGE', icon: '✓' },
  { id: 'workflows', label: 'PLAYBOOKS', icon: '▤' },
  { id: 'income', label: 'INGEST', icon: '↑' },
  { id: 'expenses', label: 'EGRESS', icon: '↓' },
  { id: 'moneyFlow', label: 'EVENT FLOW', icon: '◇' },
  { id: 'predict', label: 'FORECAST', icon: '◈' },
  { id: 'reports', label: 'DETECTIONS', icon: '▦' },
  { id: 'documents', label: 'LOGS', icon: '▧' },
  { id: 'marketplace', label: 'INTEL FEEDS', icon: '◫' },
  { id: 'settings', label: 'SETTINGS', icon: '⚙' }
];

/* ── Stars ── */
const StarField = ({ count = 140 }) => {
  const s = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        i,
        cx: Math.random() * 100,
        cy: Math.random() * 100,
        r: Math.random() * 1.2 + 0.2,
        o: Math.random() * 0.5 + 0.08,
        d: Math.random() * 5
      })),
    [count]
  );
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      {s.map((s) => (
        <circle
          key={s.i}
          cx={`${s.cx}%`}
          cy={`${s.cy}%`}
          r={s.r}
          fill="white"
          opacity={s.o}
          style={{
            animation: `cc-twinkle ${2 + s.d}s ease-in-out infinite alternate`,
            animationDelay: `${s.d}s`
          }}
        />
      ))}
    </svg>
  );
};

/* ── Draggable panel wrapper ── */
const DraggablePanel = ({
  id,
  children,
  className = '',
  offset,
  style,
  size,
  onResize,
  onResizeCommit
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  // Combine saved offset + active drag delta into a single transform.
  // Preserve any Tailwind centering transform (-translate-x/y-1/2) so the drag
  // offset ADDS to centering instead of replacing it — replacing it is what made
  // centered panels snap half-width off-center when first dragged.
  const centerX = className.includes('-translate-x-1/2');
  const centerY = className.includes('-translate-y-1/2');
  const ox = (offset?.x || 0) + (transform?.x || 0);
  const oy = (offset?.y || 0) + (transform?.y || 0);

  // A resized panel is PINNED to the top-left position it had when the
  // resize started (size.px/py, pre-offset). Without the pin, growing a
  // bottom- or right-anchored panel pushes it upward/leftward — off-screen
  // in the worst case. The pin already includes any centering translate, so
  // centering is dropped while pinned.
  const pinned = size && size.px != null;

  const parts = [];
  if (centerX && !pinned) parts.push('translateX(-50%)');
  if (centerY && !pinned) parts.push('translateY(-50%)');
  if (ox || oy) parts.push(`translate(${ox}px, ${oy}px)`);

  const combinedStyle = {
    ...style,
    ...(size ? { width: size.w, height: size.h } : null),
    ...(pinned
      ? { left: size.px, top: size.py, right: 'auto', bottom: 'auto' }
      : null),
    transform: parts.length ? parts.join(' ') : undefined,
    zIndex: isDragging ? 50 : undefined
  };

  // Corner drag-to-resize. Plain pointer events (no dnd-kit): the delta maps
  // 1:1 to width/height, clamped to the centre container so a panel can't be
  // stretched off-screen. Commit persists once on release.
  const startResize = (e) => {
    if (!onResize) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget.closest('[data-panel-id]');
    if (!el) return;
    const startRect = el.getBoundingClientRect();
    const hostRect = el.closest('#cc-main')?.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    // Pin the panel where it currently sits (minus the drag offset, which
    // stays applied as a transform) so the SE corner is what moves. When the
    // corner reaches the container edge, the pin slides back (up/left) so
    // the panel can keep growing until it fills the container.
    const startLeftHost = hostRect ? startRect.left - hostRect.left : 0;
    const startTopHost = hostRect ? startRect.top - hostRect.top : 0;
    const offX = offset?.x || 0;
    const offY = offset?.y || 0;
    const move = (ev) => {
      let w = Math.max(120, startRect.width + (ev.clientX - sx));
      let h = Math.max(60, startRect.height + (ev.clientY - sy));
      let leftHost = startLeftHost;
      let topHost = startTopHost;
      if (hostRect) {
        w = Math.min(w, hostRect.width - 16);
        h = Math.min(h, hostRect.height - 16);
        leftHost = Math.max(8, Math.min(startLeftHost, hostRect.width - 8 - w));
        topHost = Math.max(8, Math.min(startTopHost, hostRect.height - 8 - h));
      }
      onResize(id, {
        w: Math.round(w),
        h: Math.round(h),
        px: Math.round(leftHost - offX),
        py: Math.round(topHost - offY)
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onResizeCommit?.();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      ref={setNodeRef}
      data-panel-id={id}
      className={`${className} ${
        // A user-sized panel becomes a column and its cards stretch to fill
        // (cc-panel-sized, index.css) — absolute-positioned handles are out
        // of flow and unaffected.
        size ? 'flex flex-col cc-panel-sized' : ''
      } ${isDragging ? 'opacity-80' : ''}`}
      style={combinedStyle}
    >
      {/* Drag handle — inside the chamfer, offset from the cut corner */}
      <div
        {...listeners}
        {...attributes}
        className="absolute top-1.5 z-30 cursor-grab active:cursor-grabbing p-1 text-hud-dim hover:text-hud-accent transition"
        style={{ right: CHAMFER + 4 }}
        title="Drag to move"
      >
        <FiMove size={9} />
      </div>
      {/* Resize handle — bottom-right corner bracket */}
      {onResize && (
        <div
          onPointerDown={startResize}
          className="absolute bottom-0 right-0 z-30 flex h-4 w-4 cursor-se-resize items-end justify-end p-0.5 text-hud-dim hover:text-hud-accent transition"
          title="Drag to resize"
        >
          <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
            <path
              d="M6.5 0.5 V6.5 H0.5"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </div>
      )}
      {children}
    </div>
  );
};

/* ── HUD panel — chamfered top-right corner with Canvas border ── */
const CHAMFER = 14;
const HUD_CLIP = `polygon(0 0, calc(100% - ${CHAMFER}px) 0, 100% ${CHAMFER}px, 100% 100%, 0 100%)`;

const HudBorderCanvas = ({ canvasRef }) => {
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Draw chamfered border — fixed CHAMFER size regardless of panel size
      ctx.beginPath();
      ctx.moveTo(0.5, 0.5);
      ctx.lineTo(w - CHAMFER - 0.5, 0.5);
      ctx.lineTo(w - 0.5, CHAMFER + 0.5);
      ctx.lineTo(w - 0.5, h - 0.5);
      ctx.lineTo(0.5, h - 0.5);
      ctx.closePath();

      ctx.strokeStyle = 'rgba(46,219,232,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [canvasRef]);

  return null;
};

const Hud = ({ children, className = '', title, fill = false }) => {
  const borderRef = useRef(null);
  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={borderRef}
        className="absolute inset-0 pointer-events-none z-[2]"
      />
      <HudBorderCanvas canvasRef={borderRef} />
      <div
        className={`bg-black/40 backdrop-blur-sm px-3 py-2 h-full overflow-hidden ${
          // fill: a user-resized panel — lay the body out as a column so a
          // flex-1 child (list, chart) can grow with the card.
          fill ? 'flex flex-col' : ''
        }`}
        style={{ clipPath: HUD_CLIP }}
      >
        {title && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/15 to-transparent" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-hud-dim font-mono">
              {title}
            </p>
            <div className="h-px flex-1 bg-gradient-to-l from-cyan-500/15 to-transparent" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

/* ── Stat ── */
const S = ({ l, v, c = '#fff' }) => (
  <div className="flex items-center justify-between py-[3px]">
    <span className="text-[10px] uppercase tracking-wider text-hud-dim font-mono">
      {l}
    </span>
    <span
      className="text-[12px] font-bold tabular-nums font-mono"
      style={{ color: c }}
    >
      {v}
    </span>
  </div>
);

/* ── Activity ── */
const Act = ({ title, status, agent, time }) => (
  <div className="flex items-start gap-1.5 py-[2px]">
    <div
      className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: STATUS_COLORS[status] || '#6B7280' }}
    />
    <div className="min-w-0 flex-1">
      <p className="text-[11px] text-hud-dim truncate font-mono">{title}</p>
      <p className="text-[9px] text-hud-dim font-mono">
        {agent} · {time}
      </p>
    </div>
  </div>
);

/* ── Interactive file tree ── */
const FILE_TREE = [
  {
    name: 'soc',
    type: 'folder',
    children: [
      {
        name: 'documents',
        type: 'folder',
        children: [
          { name: 'incident_report.pdf', type: 'pdf' },
          { name: 'asset_inventory.csv', type: 'spreadsheet' },
          { name: 'triage_runbook.md', type: 'doc' }
        ]
      },
      {
        name: 'receipts',
        type: 'folder',
        children: [
          { name: 'auth.log', type: 'doc' },
          { name: 'ids_alerts.log', type: 'doc' }
        ]
      },
      {
        name: 'exports',
        type: 'folder',
        children: [
          { name: 'firewall.csv', type: 'spreadsheet' },
          { name: 'capture_0417.pcap', type: 'doc' },
          { name: 'iocs_q1.csv', type: 'spreadsheet' }
        ]
      },
      { name: 'imports', type: 'folder', children: [] }
    ]
  }
];

const FileIcon = ({ type }) => {
  if (type === 'pdf')
    return <FiFileText size={11} className="text-red-400/70 flex-shrink-0" />;
  if (type === 'spreadsheet')
    return <FiGrid size={11} className="text-green-400/70 flex-shrink-0" />;
  if (type === 'doc')
    return <FiFileText size={11} className="text-cyan-400/70 flex-shrink-0" />;
  return <FiFileText size={11} className="text-hud-dim flex-shrink-0" />;
};

const FileTreeNode = ({ node, depth = 0, onFileClick }) => {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.type === 'folder';
  const pl = depth * 16;

  if (isFolder) {
    return (
      <React.Fragment>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-1.5 py-[1px] leading-tight hover:bg-cyan-500/[0.04] transition text-left"
          style={{ paddingLeft: pl }}
        >
          {open ? (
            <FiChevronDown
              size={10}
              className="text-hud-dim flex-shrink-0"
            />
          ) : (
            <FiChevronRight
              size={10}
              className="text-hud-dim flex-shrink-0"
            />
          )}
          <FiFolder
            size={11}
            className={`flex-shrink-0 ${
              open ? 'text-cyan-400/60' : 'text-hud-dim'
            }`}
          />
          <span
            className={`text-[11px] font-mono leading-tight ${
              open ? 'text-cyan-500/70' : 'text-hud-dim'
            }`}
          >
            /{node.name}
          </span>
        </button>
        {open && (
          <React.Fragment>
            {node.children.map((child, i) => (
              <FileTreeNode
                key={child.name + i}
                node={child}
                depth={depth + 1}
                onFileClick={onFileClick}
              />
            ))}
            {/* Add button at end of folder */}
            <button
              type="button"
              className="w-full flex items-center gap-1.5 py-[1px] leading-tight hover:bg-cyan-500/[0.04] transition text-left"
              style={{ paddingLeft: pl + 16 }}
            >
              <FiPlus size={9} className="text-cyan-500/25 flex-shrink-0" />
              <span className="text-[9px] font-mono text-cyan-500/25 italic">
                add
              </span>
            </button>
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }

  const fileColor =
    node.type === 'pdf'
      ? 'text-red-400/70 hover:text-red-300'
      : node.type === 'spreadsheet'
      ? 'text-green-400/70 hover:text-green-300'
      : 'text-cyan-400/70 hover:text-cyan-300';

  return (
    <button
      type="button"
      onClick={() => onFileClick?.(node)}
      className={`w-full flex items-center gap-1.5 py-[1px] leading-tight hover:bg-cyan-500/[0.04] transition text-left ${fileColor}`}
      style={{ paddingLeft: pl }}
    >
      <FileIcon type={node.type} />
      <span className="text-[11px] font-mono leading-tight truncate">
        {node.name}
      </span>
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  CANVAS RING SYSTEM + LUNAR CALLOUTS                               */
/* ═══════════════════════════════════════════════════════════════════ */

const CoreCanvas = ({
  agents,
  healthPct = 98,
  onHexClick,
  containerRef,
  detectionsPulseRef,
  logErrorsRef,
  alertFindingsRef
}) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef?.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const R = {
      outerTicks: 0.44,
      outer: 0.42,
      agentOrbit: 0.38,
      data1: 0.33,
      data2: 0.29,
      health: 0.26,
      inner1: 0.22,
      inner2: 0.19,
      inner3: 0.16,
      core: 0.12,
      coreInner: 0.095
    };

    const hexPoints = (x, y, r) => {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
      }
      return pts;
    };

    const drawHex = (ctx, x, y, r, fillColor, strokeColor, lw) => {
      const pts = hexPoints(x, y, r);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lw;
      ctx.stroke();
    };

    const drawGlowCircle = (ctx, cx, cy, r, color, alpha, blur) => {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    };

    const drawArc = (
      ctx,
      cx,
      cy,
      r,
      startAngle,
      endAngle,
      color,
      lw,
      alpha,
      blur
    ) => {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = blur || 0;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = 'butt';
      ctx.stroke();
      ctx.restore();
    };

    const drawCallout = (ctx, fromX, fromY, toX, toY, color) => {
      // Elbow: go horizontal first, then diagonal
      const midX = fromX + (toX - fromX) * 0.3;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(midX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // End dot
      ctx.beginPath();
      ctx.arc(toX, toY, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.restore();
    };

    const draw = (time) => {
      timeRef.current = time;
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w / dpr, h / dpr);

      const cw = w / dpr;
      const ch = h / dpr;
      const cx = cw / 2;
      const cy = ch / 2;
      const scale = Math.min(cw, ch);
      const rot = time * 0.0001;

      // ── Ambient glow ──
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.48);
      grd.addColorStop(0, 'rgba(46,219,232,0.04)');
      grd.addColorStop(0.6, 'rgba(124,77,255,0.015)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, cw, ch);

      // ── Outer tick marks (120) ──
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2 + rot * 0.1;
        const major = i % 10 === 0;
        const mid = i % 5 === 0;
        const r1 = scale * R.outerTicks;
        const r2 =
          r1 + (major ? scale * 0.016 : mid ? scale * 0.01 : scale * 0.005);
        ctx.beginPath();
        ctx.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
        ctx.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a));
        ctx.strokeStyle = '#2EDBE8';
        ctx.lineWidth = major ? 1.2 : mid ? 0.6 : 0.3;
        ctx.globalAlpha = major ? 0.3 : mid ? 0.15 : 0.07;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ── Compass labels ──
      const labels = [
        'N',
        '030',
        '060',
        'E',
        '120',
        '150',
        'S',
        '210',
        '240',
        'W',
        '300',
        '330'
      ];
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#2EDBE8';
      labels.forEach((l, i) => {
        const a = (i / 12) * Math.PI * 2 + rot * 0.1;
        const r = scale * (R.outerTicks + 0.03);
        ctx.fillText(l, cx + r * Math.cos(a), cy + r * Math.sin(a));
      });
      ctx.globalAlpha = 1;

      // ── Outer ring (rotating) ──
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.setLineDash([3, 8]);
      ctx.beginPath();
      ctx.arc(cx, cy, scale * R.outer, rot, rot + Math.PI * 2);
      ctx.strokeStyle = '#2EDBE8';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // ── Agent orbit ring ──
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        scale * R.agentOrbit,
        -rot * 0.7,
        -rot * 0.7 + Math.PI * 2
      );
      ctx.strokeStyle = '#2EDBE8';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // ── Campaign data arcs ──
      const campaigns = [
        { pct: 0.72, color: '#EC4899' },
        { pct: 0.45, color: '#F59E0B' },
        { pct: 0.88, color: '#34d399' }
      ];
      const gap = 0.04;
      const segSize = (1 - gap * campaigns.length) / campaigns.length;
      drawArc(
        ctx,
        cx,
        cy,
        scale * R.data1,
        0,
        Math.PI * 2,
        '#1e293b',
        5,
        0.2,
        0
      );
      campaigns.forEach((c, i) => {
        const start = i * (segSize + gap) * Math.PI * 2 - Math.PI / 2;
        const end = start + segSize * c.pct * Math.PI * 2;
        drawArc(ctx, cx, cy, scale * R.data1, start, end, c.color, 5, 0.6, 4);
      });

      // ── Donation activity dots ──
      drawArc(
        ctx,
        cx,
        cy,
        scale * R.data2,
        0,
        Math.PI * 2,
        '#334155',
        0.4,
        0.15,
        0
      );
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const active = (i * 7 + 3) % 5 !== 0; // deterministic
        const dx = cx + scale * R.data2 * Math.cos(a);
        const dy = cy + scale * R.data2 * Math.sin(a);
        ctx.beginPath();
        ctx.arc(dx, dy, active ? 3 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#2EDBE8' : '#334155';
        ctx.globalAlpha = active ? 0.5 : 0.2;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── Health arc ──
      drawArc(
        ctx,
        cx,
        cy,
        scale * R.health,
        0,
        Math.PI * 2,
        '#1e293b',
        4,
        0.25,
        0
      );
      const hEnd = (healthPct / 100) * Math.PI * 2 - Math.PI / 2;
      drawArc(
        ctx,
        cx,
        cy,
        scale * R.health,
        -Math.PI / 2,
        hEnd,
        '#2EDBE8',
        4,
        0.7,
        8
      );

      // ── Inner decorative rings ──
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.setLineDash([12, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, scale * R.inner1, -rot * 1.2, -rot * 1.2 + Math.PI * 2);
      ctx.strokeStyle = '#7C4DFF';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.setLineDash([4, 6]);
      ctx.globalAlpha = 0.07;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * R.inner2, rot * 0.8, rot * 0.8 + Math.PI * 2);
      ctx.strokeStyle = '#2EDBE8';
      ctx.lineWidth = 0.3;
      ctx.stroke();
      ctx.setLineDash([2, 5]);
      ctx.globalAlpha = 0.05;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * R.inner3, -rot * 1.5, -rot * 1.5 + Math.PI * 2);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 0.3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // ── Core rings ──
      drawGlowCircle(ctx, cx, cy, scale * R.core, '#2EDBE8', 0.12, 4);
      drawGlowCircle(ctx, cx, cy, scale * R.coreInner, '#34d399', 0.08, 0);

      // ── Agent hexagons ──
      agents.forEach((a, i) => {
        const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
        const ax = cx + scale * R.agentOrbit * Math.cos(angle);
        const ay = cy + scale * R.agentOrbit * Math.sin(angle);
        const col = STATUS_COLORS[a.status] || '#6B7280';
        const hexR = scale * 0.025;

        // Connection line to center
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = col;
        ctx.lineWidth = 0.3;
        ctx.globalAlpha = 0.06;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Signal-driven glow — a hex only glitches when there is something
        // for the operator to look into (never a permanent demo pulse):
        // - ANOMALIES ('anom') crackles while the ingested log window has
        //   live errors (fed by the LOG STREAM poll via logErrorsRef).
        // - DETECTIONS ('rpt') glows transiently after a new finding lands
        //   on the triage board (detectionsPulseUntilRef).
        const detActive =
          a.id === 'rpt' &&
          (detectionsPulseRef?.current || 0) > performance.now();
        const anomActive =
          a.id === 'anom' && (logErrorsRef?.current || 0) > 0;
        // ALERTS ('evt') crackles while open HIGH/CRITICAL findings sit on the
        // triage board — the "these are pretty high up" signal.
        const alertActive =
          a.id === 'evt' && (alertFindingsRef?.current || 0) > 0;
        if (anomActive || alertActive || detActive) {
          const now = performance.now();
          const seed = a.id === 'anom' ? 2.1 : a.id === 'rpt' ? 4.7 : 0;
          // Glitchy, unpredictable pulse: a calm baseline with intermittent
          // flares + rare dropouts, so it reads like a signal glitch rather than
          // a smooth breathing loop. Layered incommensurate sines fake the
          // randomness deterministically (no per-frame strobing).
          const base = 0.24 + 0.14 * Math.sin(now / 520 + seed);
          const t = now / 78 + seed;
          const noise = Math.abs(Math.sin(t) * Math.sin(t * 1.7) * Math.sin(t * 0.31));
          const flare = noise > 0.78 ? (noise - 0.78) / 0.22 : 0;
          let pulse = Math.min(1, base + flare * 1.2);
          // rare glitch dropout (flickers dark for a beat)
          if (Math.sin(now / 43 + seed) * Math.sin(now / 131) > 0.985) pulse *= 0.15;
          // strong high-frequency vibration during a flare — reads like a
          // lightning/thunder crackle rather than a gentle jitter.
          const buzz = 2 + flare * 5.5;
          const gx = flare > 0.15 ? Math.sin(now * 3.6 + seed) * buzz : 0;
          const gy = flare > 0.15 ? Math.cos(now * 4.3) * buzz : 0;
          const halo = hexPoints(ax + gx, ay + gy, hexR * (1.2 + pulse * 0.55));
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(halo[0][0], halo[0][1]);
          for (let hp = 1; hp < halo.length; hp++) ctx.lineTo(halo[hp][0], halo[hp][1]);
          ctx.closePath();
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.09 + pulse * 0.52;
          ctx.lineWidth = 1 + flare * 1.1;
          ctx.shadowColor = col;
          ctx.shadowBlur = 2 + pulse * 13;
          ctx.stroke();
          ctx.restore();
        }

        // Hex
        drawHex(ctx, ax, ay, hexR, 'rgba(2,3,9,0.85)', col, 1.5);

        // Icon text
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = col;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(a.icon, ax, ay + 1);

        // Label below
        ctx.font = '7px monospace';
        ctx.fillStyle = '#4B5563';
        ctx.globalAlpha = 0.7;
        ctx.fillText(a.label.toUpperCase(), ax, ay + hexR + 12);
        ctx.globalAlpha = 1;

        // Task count above
        ctx.font = '6px monospace';
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.4;
        ctx.fillText(String(a.tasks), ax, ay - hexR - 6);
        ctx.globalAlpha = 1;
      });

      // ── Center text ──
      ctx.save();
      ctx.shadowColor = '#2EDBE8';
      ctx.shadowBlur = 15;
      ctx.font = 'bold 32px monospace';
      ctx.fillStyle = '#2EDBE8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(healthPct), cx, cy - 16);
      ctx.restore();

      ctx.font = '8px monospace';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '2px';
      ctx.fillText('SYSTEM HEALTH', cx, cy + 2);

      ctx.font = '7px monospace';
      ctx.fillStyle = '#34d399';
      ctx.globalAlpha = 0.6;
      ctx.fillText('● OPERATIONAL', cx, cy + 28);
      ctx.globalAlpha = 1;

      // Lunar callouts disabled — will revisit with proper elbow routing

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    // Click handler for hexagons — registered on the CONTAINER in capture
    // phase so hexes stay clickable even when a floating panel drifts (or is
    // dragged) over the ring. Plain clicks over a hex go to the hex; clicks
    // on a panel's interactive controls are never hijacked.
    const clickHost = canvas.parentElement;
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cw = rect.width;
      const ch = rect.height;
      const cx = cw / 2;
      const cy = ch / 2;
      const sc = Math.min(cw, ch);

      const hit = agents.find((a, i) => {
        const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
        const ax = cx + sc * R.agentOrbit * Math.cos(angle);
        const ay = cy + sc * R.agentOrbit * Math.sin(angle);
        return Math.sqrt((mx - ax) ** 2 + (my - ay) ** 2) < sc * 0.03;
      });
      if (!hit) return;

      if (e.target !== canvas && e.target instanceof Element) {
        // Something floats over this hex. Steal only inert clicks — leave
        // controls, links, the hex popup itself, and drag handles alone.
        if (
          e.target.closest(
            'button, a, input, select, textarea, [role="button"], ' +
              '[contenteditable="true"], [data-hex-popup], ' +
              '.cursor-pointer, .cursor-grab, .cursor-se-resize'
          )
        ) {
          return;
        }
      }

      e.preventDefault();
      e.stopPropagation();
      onHexClick?.(hit.id);
    };

    clickHost?.addEventListener('click', handleClick, true);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      clickHost?.removeEventListener('click', handleClick, true);
    };
  }, [agents, healthPct, onHexClick, containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[12] cursor-pointer"
    />
  );
};

/* ═══════════════════════════════════════════════════════════════════ */

const CommandCenterV2 = () => {
  const navigate = useNavigate();
  const params = useParams();
  const {
    seed,
    teams,
    getTeamsBySeed,
    incomeTotal,
    expenseTotal,
    donations,
    childrenTotal,
    getIncomeTotal,
    getExpsenseTotal
  } = useSeedContext();
  // Resolve the active workspace: URL param → seed context → the stored user
  // summary's resolved active workspace (the seed-hydration hooks aren't mounted
  // in this HUD, so without this fallback resolvedSeedId is null and the whole
  // command center is workspace-blind — no KANBAN, no workspace-scoped data).
  const resolvedSeedId = normalizeSeedId(
    params?.seed ||
      seed?.id ||
      resolveStoredSummaryWorkspaceId(readViewerStoredUserSummary())
  );
  const agentCtx = useAgentContext() || {};
  // Stable reference for hooks below — agentCtx itself is re-created by the
  // `|| {}` fallback, but the sessions array comes from context state.
  const activeAgentSessions = agentCtx?.activeSessions;
  // Risk-gated capability toggles (agent hex panel). Local overrides keyed by
  // agent id so a PATCHed toggle reflects immediately without an agents refetch.
  const [agentCapOverrides, setAgentCapOverrides] = useState({});
  const [capSavingAgentId, setCapSavingAgentId] = useState(null);
  const toggleDraftPrCapability = useCallback(async (agentId, next) => {
    setCapSavingAgentId(agentId);
    try {
      const r = await agentsApi.updateCapabilities(agentId, {
        open_draft_pr: next
      });
      const caps = r?.data?.capabilities || { open_draft_pr: next };
      setAgentCapOverrides((prev) => ({ ...prev, [agentId]: caps }));
      toast.success(
        next
          ? 'Draft-PR capability enabled — the agent may open draft fix PRs'
          : 'Draft-PR capability disabled',
        { icon: next ? '✅' : '🔒' }
      );
    } catch (e) {
      toast.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          'Unable to update capability',
        { icon: '⚠️' }
      );
    } finally {
      setCapSavingAgentId(null);
    }
  }, []);
  const { tasks: kanbanTasks = [], fetchColumns } = useKanbanBoardContext() || {};
  const { logout } = useAuthContext() || {};
  const { storedUser } = useViewerSession();
  const userName =
    resolveStoredUserDisplayLabel(storedUser) ||
    resolveStoredUsername(storedUser) ||
    'Operator';
  // Linux-operator convention: the admin identity is surfaced as "root".
  const operatorLabel = toLinuxRoleLabel(userName) || userName;
  // The active workspace's display name. Field is `workspace_name` (not
  // `name`); fall back to the stored summary when `seed` isn't hydrated yet.
  const workspaceName =
    seed?.workspace_name ||
    seed?.name ||
    resolveStoredSummaryWorkspaceName(readViewerStoredUserSummary()) ||
    'Workspace';

  const [theme, setTheme] = useState('space');
  // Dark ⇄ Light HUD mode (persisted). Adds `hud-light` to the HUD root, which
  // flips the --hud-* token layer to the Daylight (steel) palette.
  const [hudMode, setHudMode] = useState(() => {
    try {
      return localStorage.getItem('cc-v2-hud-mode') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const isLight = hudMode === 'light';
  const toggleHudMode = useCallback(() => {
    setHudMode((m) => {
      const next = m === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('cc-v2-hud-mode', next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [chatOpen, setChatOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  // Right side-nav drawer open state — used to yield the operator badge, which
  // otherwise floats over the flyout.
  const [rightNavOpen, setRightNavOpen] = useState(false);
  // Templates browsed as a file-tree root (from the Template Kernel gallery) +
  // the currently-previewed template.
  const [previewTemplate, setPreviewTemplate] = useState(null);
  // Template → Reports studio hand-off: the "DRAFT WITH AI" button seeds a new
  // draft with the template scaffold when the studio panel opens.
  const [draftStudioSeed, setDraftStudioSeed] = useState(null);
  // Which settings section to open the settings drawer to (profile/security/…).
  const [settingsSection, setSettingsSection] = useState('profile');
  const openSettings = useCallback((sectionId = 'profile') => {
    setSettingsSection(sectionId);
    setActivePanel('settings');
  }, []);
  const { root: templatesRoot, templates: allTemplates } =
    useTemplatesTree(resolvedSeedId);
  // Files-tree click: template leaves open the preview; other files fall through.
  const handleFileClick = useCallback((node) => {
    if (node?.__template) {
      setPreviewTemplate(node.__template);
    } else {
      setActivePanel('documents');
    }
  }, []);
  const [hudSearchParams] = useSearchParams();
  // Onboarding is a blocking MODAL over the HUD (single-screen rule), not a
  // route: a signed-in operator with no workspace sees it float over the
  // command center until they create/join one.
  const { needsOnboarding } = useOnboardingStatus();
  const [chatInput, setChatInput] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [activeContext, setActiveContext] = useState('ai');
  const [activeHexPanel, setActiveHexPanel] = useState(null);
  const [recycleBinOpen, setRecycleBinOpen] = useState(false);
  const [filesData, setFilesData] = useState({
    documents: [],
    receipts: [],
    loading: false
  });
  const voice = useSpeechToText();
  const chat = useChatSession(null);
  const mainRef = useRef(null);

  // Live size of the centre area — drives ring-aware default anchors for the
  // floating side panels so their resting position never covers the core ring.
  const [mainDims, setMainDims] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return undefined;
    const update = () => setMainDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Default anchors for the OPERATIONS / RECON side panels: just outside the
  // ring's outer ticks (0.44 × min-dimension — see CoreCanvas R). The centre
  // assembly is the HUD's primary display; nothing may rest on top of it
  // (single-screen rule). Clamped only toward the container edge, so the
  // clamp can never push a panel back over the ring.
  const ringSideAnchors = useMemo(() => {
    if (!mainDims.w || !mainDims.h) return null;
    const ringR = 0.44 * Math.min(mainDims.w, mainDims.h);
    const cx = mainDims.w / 2;
    const PANEL_W = 150;
    const GAP = 12;
    const top = Math.round(mainDims.h * 0.24);
    return {
      left: {
        left: Math.max(8, Math.round(cx - ringR - GAP - PANEL_W)),
        top
      },
      right: {
        left: Math.min(
          mainDims.w - PANEL_W - 8,
          Math.round(cx + ringR + GAP)
        ),
        top
      }
    };
  }, [mainDims.w, mainDims.h]);

  // Deep-link a panel open via ?panel=<id> (e.g. /?panel=settings). Stays on
  // the single HUD route "/" — the panel floats over the command center, we
  // never navigate away (see .claude/rules/single-screen-hud.md).
  useEffect(() => {
    const p = hudSearchParams.get('panel');
    if (p) setActivePanel(p);
    // Optional ?section=<id> targets a specific Settings section on open
    // (e.g. /?panel=settings&section=members). Deterministic deep-link used by
    // the e2e suite and any "open me at X" links.
    const s = hudSearchParams.get('section');
    if (s) setSettingsSection(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DETECTIONS hex pulse — fires a transient glitch-glow on the Detections node
  // whenever a new finding lands on the triage board (kanban task count rises).
  // Read live inside the canvas draw loop via the ref (no re-registration).
  const detectionsPulseUntilRef = useRef(0);
  const prevKanbanCountRef = useRef(null);
  useEffect(() => {
    const count = kanbanTasks.length;
    if (prevKanbanCountRef.current === null) {
      prevKanbanCountRef.current = count; // baseline the first load — no glow
      return;
    }
    if (count > prevKanbanCountRef.current) {
      // glow for ~6s after a new finding is added/assigned
      detectionsPulseUntilRef.current = performance.now() + 6000;
    }
    prevKanbanCountRef.current = count;
  }, [kanbanTasks.length]);

  // ANOMALIES hex — live error signal from the LOG STREAM poll. The ref feeds
  // the canvas draw loop (glitch only while errors exist); the state feeds the
  // hex's click-through panel listing the flagged error lines.
  const logErrorsRef = useRef(0);
  const [logErrorRecords, setLogErrorRecords] = useState([]);
  useEffect(() => {
    const onStream = (e) => {
      logErrorsRef.current = e.detail?.errors || 0;
      setLogErrorRecords(e.detail?.errorRecords || []);
    };
    window.addEventListener('autosec:logstream', onStream);
    return () => window.removeEventListener('autosec:logstream', onStream);
  }, []);

  // Hydrate the shared board tasks on the dashboard so the ALERTS hex reflects
  // open findings WITHOUT the operator first opening the KANBAN board. Resolves
  // the workspace's default team and loads its team board once; the same
  // `tasks` state feeds the board when it's later opened (one source of truth,
  // no duplicate fetch).
  useEffect(() => {
    if (!resolvedSeedId || !fetchColumns) return;
    let cancelled = false;
    const hydrate = async () => {
      let list = teams;
      if ((!list || list.length === 0) && getTeamsBySeed) {
        list = await Promise.resolve(getTeamsBySeed(resolvedSeedId)).catch(() => null);
      }
      if (cancelled || !list || list.length === 0) return;
      const home = list.find((t) => t?.is_default) || list[0];
      const teamId = home?.id ?? home?.pk;
      if (teamId) fetchColumns(teamId, resolvedSeedId);
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [resolvedSeedId, teams, getTeamsBySeed, fetchColumns]);

  // ALERTS hex — open HIGH/CRITICAL findings on the triage board (the filed,
  // triaged findings with suggested fixes, distinct from Anomalies' raw live
  // stream errors). The ref drives the canvas glitch; the state drives the
  // hex's click-through list.
  const RESOLVED_STATUSES = useMemo(
    () => new Set(['resolved', 'done', 'complete', 'completed', 'canceled', 'cancelled']),
    []
  );
  const alertFindings = useMemo(() => {
    return (kanbanTasks || []).filter((t) => {
      const status = (t?.status || '').toString().toLowerCase();
      if (RESOLVED_STATUSES.has(status)) return false;
      const sev = (
        t?.log_watch?.severity ||
        t?.priority ||
        (t?.title || '').match(/\[(critical|high)\]/i)?.[1] ||
        ''
      )
        .toString()
        .toLowerCase();
      return sev === 'high' || sev === 'critical';
    });
  }, [kanbanTasks, RESOLVED_STATUSES]);
  const alertFindingsRef = useRef(0);
  useEffect(() => {
    alertFindingsRef.current = alertFindings.length;
  }, [alertFindings.length]);

  // Panel positions — persisted offsets from drag
  const [panelOffsets, setPanelOffsets] = useState(() => {
    try {
      const saved = localStorage.getItem('cc-v2-panel-offsets');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // User-set panel sizes (corner drag-to-resize) — persisted like offsets.
  const [panelSizes, setPanelSizes] = useState(() => {
    try {
      const saved = localStorage.getItem('cc-v2-panel-sizes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handlePanelResize = useCallback((id, size) => {
    setPanelSizes((prev) => ({ ...prev, [id]: size }));
  }, []);

  // Live resize keeps state only; the localStorage write happens once, on
  // pointer release.
  const persistPanelSizes = useCallback(() => {
    setPanelSizes((prev) => {
      try {
        localStorage.setItem('cc-v2-panel-sizes', JSON.stringify(prev));
      } catch {}
      return prev;
    });
  }, []);

  // Shared wiring for every resizable DraggablePanel.
  const resizeProps = useCallback(
    (id) => ({
      size: panelSizes[id],
      onResize: handlePanelResize,
      onResizeCommit: persistPanelSizes
    }),
    [panelSizes, handlePanelResize, persistPanelSizes]
  );

  const handleDragEnd = useCallback((event) => {
    const { active, delta } = event;
    if (!delta.x && !delta.y) return;

    // Clamp: get the panel's current DOM rect and the container rect
    const container = mainRef.current;
    const panelEl = document.querySelector(`[data-panel-id="${active.id}"]`);

    setPanelOffsets((prev) => {
      const existing = prev[active.id] || { x: 0, y: 0 };
      let newX = existing.x + delta.x;
      let newY = existing.y + delta.y;

      // Clamp to keep panel within viewport
      if (container && panelEl) {
        const cRect = container.getBoundingClientRect();
        const pRect = panelEl.getBoundingClientRect();
        const pw = pRect.width;
        const ph = pRect.height;

        // Calculate where the panel would end up (original position + offset)
        const origLeft = pRect.left - (existing.x || 0) - cRect.left;
        const origTop = pRect.top - (existing.y || 0) - cRect.top;

        const minX = -origLeft + 10; // don't go past left edge
        const maxX = cRect.width - origLeft - pw + -10; // don't go past right edge
        const minY = -origTop + 10;
        const maxY = cRect.height - origTop - ph - 10;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
      }

      const updated = {
        ...prev,
        [active.id]: { x: newX, y: newY }
      };
      try {
        localStorage.setItem('cc-v2-panel-offsets', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const resetPanelPositions = useCallback(() => {
    setPanelOffsets({});
    setPanelSizes({});
    try {
      localStorage.removeItem('cc-v2-panel-offsets');
      localStorage.removeItem('cc-v2-panel-sizes');
    } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Apply V2 toast theme to body while on this page
  useEffect(() => {
    document.body.classList.add('v2-toast-theme');
    return () => document.body.classList.remove('v2-toast-theme');
  }, []);

  useEffect(() => {
    if (resolvedSeedId) {
      getIncomeTotal?.(resolvedSeedId);
      getExpsenseTotal?.(resolvedSeedId);
    }
  }, [resolvedSeedId]);

  // Fetch files data when Files context is active
  useEffect(() => {
    if (activeContext !== 'files' || !resolvedSeedId) return;
    let cancelled = false;
    setFilesData((prev) => ({ ...prev, loading: true }));
    Promise.all([
      unifiedDocumentsApi
        .list({ workspace: resolvedSeedId, limit: 50 })
        .then((r) => r.data)
        .catch(() => []),
      receiptsApi
        .list({ workspace: resolvedSeedId, limit: 50 })
        .then((r) => r.data)
        .catch(() => [])
    ]).then(([docs, rcpts]) => {
      if (!cancelled) {
        setFilesData({
          documents: docs || [],
          receipts: rcpts || [],
          loading: false
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeContext, resolvedSeedId]);

  // SIGN OUT — clear the session (server-side refresh revoke + local token
  // wipe via the auth context) then return to the HUD login screen.
  const handleBack = useCallback(async () => {
    try {
      await logout?.();
    } finally {
      navigate('/identity/login', { replace: true });
    }
  }, [logout, navigate]);

  const handleChatSubmit = useCallback(
    (e) => {
      e?.preventDefault?.();
      if (!chatInput.trim()) return;
      setChatOpen(true);
      chat.handleSend({ text: chatInput });
      setChatInput('');
    },
    [chatInput, chat]
  );

  const fmt = (v) => {
    const n = Number(v) || 0;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };

  const net = (Number(incomeTotal) || 0) - (Number(expenseTotal) || 0);

  // Agent data — real or demo fallback
  const agentList = useMemo(() => {
    const real = agentCtx?.agentInstances || agentCtx?.activeSessions || [];
    if (real.length > 0)
      return real.slice(0, 10).map((a) => ({
        id: a.id,
        label: a.agentTypeLabel || a.agent_type || 'Agent',
        status: a.status || 'idle',
        icon: (a.agentTypeLabel || '?')[0],
        tasks: 0
      }));
    return AGENTS;
  }, [agentCtx]);

  const actionList = useMemo(() => {
    const real = agentCtx?.agentActions || [];
    if (real.length > 0)
      return real.slice(0, 10).map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        agent: a.agent_type_label || a.agent_type || '',
        time: ''
      }));
    return ACTIONS;
  }, [agentCtx]);

  const activeCount = agentList.filter((a) =>
    ['running', 'active'].includes(a.status)
  ).length;

  // Which panels are visible for the active context
  const visiblePanels = useMemo(
    () => new Set(CONTEXT_PANELS[activeContext] || CONTEXT_PANELS.ai),
    [activeContext]
  );
  const showPanel = useCallback((id) => visiblePanels.has(id), [visiblePanels]);

  // Context-aware hex nodes for the center ring
  const contextHexNodes = useMemo(() => {
    if (activeContext === 'ai') return agentList;
    if (activeContext === 'projects') {
      const projects = seed?.projects || [];
      if (projects.length > 0) {
        return projects.slice(0, 10).map((p, i) => ({
          id: String(p.pk || p.id || `prj-${i}`),
          label: p.name || p.title || 'Project',
          status: p.status || 'active',
          icon: (p.name || 'P')[0],
          tasks: p.tasks_count || 0
        }));
      }
    }
    return CONTEXT_HEX_NODES[activeContext] || CONTEXT_HEX_NODES.ai;
  }, [activeContext, agentList, seed?.projects]);

  const handleHexClick = useCallback(
    (nodeId) => {
      const nodes = contextHexNodes;
      const idx = nodes.findIndex((a) => a.id === nodeId);
      if (idx < 0) return;
      const angle = (idx / nodes.length) * Math.PI * 2 - Math.PI / 2;
      const map = CONTEXT_HEX_CLICK_MAP[activeContext] || {};
      const panelId = map[nodeId] || 'moneyFlow';

      setActivePanel(null);
      setActiveHexPanel((prev) =>
        prev?.nodeId === nodeId
          ? null
          : {
              nodeId,
              hexIndex: idx,
              hexCount: nodes.length,
              angle,
              panelId,
              context: activeContext,
              color: STATUS_COLORS[nodes[idx]?.status] || '#6B7280'
            }
      );
    },
    [activeContext, contextHexNodes]
  );

  // Context-aware left stats panel
  const contextLeftPanel = useMemo(() => {
    switch (activeContext) {
      case 'projects':
        return {
          title: 'ACTIVE CASES',
          stats: [
            { l: 'ACTIVE', v: 4, c: '#34d399' },
            { l: 'TOTAL', v: 6, c: '#2EDBE8' },
            { l: 'DONE', v: 12, c: '#8B5CF6' }
          ]
        };
      case 'files':
        return {
          title: 'LOG SOURCES',
          stats: [
            { l: 'FOLDERS', v: 5, c: '#2EDBE8' },
            { l: 'LOGS', v: 29, c: '#34d399' },
            { l: 'RECENT', v: 7, c: '#F59E0B' }
          ]
        };
      case 'profile':
        return {
          title: 'OPERATOR',
          stats: [
            { l: 'ACTIONS', v: 47, c: '#34d399' },
            { l: 'ANALYSTS', v: 4, c: '#2EDBE8' },
            { l: 'SESSIONS', v: 3, c: '#F59E0B' }
          ]
        };
      default:
        return {
          title: 'AGENTS',
          stats: [
            { l: 'ACTIVE', v: activeCount || 5, c: '#34d399' },
            { l: 'TOTAL', v: agentList.length, c: '#2EDBE8' },
            {
              l: 'SESSIONS',
              v: agentCtx?.agentSessions?.length || 12,
              c: '#7C4DFF'
            },
            {
              l: 'ACTIONS',
              v: agentCtx?.agentActions?.length || actionList.length,
              c: '#F59E0B'
            }
          ]
        };
    }
  }, [activeContext, activeCount, agentList, agentCtx, actionList]);

  // Content renderer for slide-in hex panels
  const renderHexPanelContent = useCallback(
    (hexPanel) => {
      if (!hexPanel) return null;
      const { context, nodeId, panelId } = hexPanel;

      // Files context — show filtered file tree
      if (context === 'files') {
        const folderName = FILE_HEX_FOLDER_MAP[nodeId];
        const folder = FILE_TREE[0]?.children?.find(
          (c) => c.name === folderName
        );
        if (folder) {
          return (
            <div className="max-h-full overflow-y-auto cc-scrollbar">
              {(folder.children || []).length > 0 ? (
                folder.children.map((node, i) => (
                  <FileTreeNode key={node.name + i} node={node} depth={0} />
                ))
              ) : (
                <p className="text-[9px] font-mono text-hud-dim p-2">
                  No files in {folderName}
                </p>
              )}
            </div>
          );
        }
      }

      // ANOMALIES hex — the live flagged errors from the ingested log window.
      // This is the click-through behind the glitch: crackling hex → here's
      // exactly what tripped the detector.
      if (nodeId === 'anom') {
        if (logErrorRecords.length === 0) {
          return (
            <div className="p-2">
              <p className="font-mono text-[9px] text-emerald-400/90">
                ALL CLEAR — no active errors in the log window.
              </p>
              <p className="mt-1 font-mono text-[8px] text-hud-dim">
                This hex glitches when the ingested stream contains
                ERROR/CRITICAL records or tracebacks.
              </p>
            </div>
          );
        }
        return (
          <div className="max-h-full overflow-y-auto cc-scrollbar p-1">
            <p className="mb-1 font-mono text-[8px] tracking-[0.15em] text-rose-400">
              {logErrorRecords.length} ACTIVE ERROR
              {logErrorRecords.length > 1 ? 'S' : ''} IN WINDOW
            </p>
            {logErrorRecords.map((r, i) => (
              <div
                key={i}
                className="mb-1 border-l-2 border-rose-500/50 pl-1.5"
              >
                <p className="font-mono text-[8px] text-hud-dim">
                  <span className="text-hud-accent/70">[{r.service}]</span>{' '}
                  <span className="font-bold text-rose-400">{r.level}</span>
                </p>
                <p className="font-mono text-[8px] leading-[1.5] text-hud-text/85 break-words">
                  {r.message}
                </p>
              </div>
            ))}
          </div>
        );
      }

      // ALERTS hex — open HIGH/CRITICAL findings on the board, each with its
      // grounded suggested fix. This is the triaged counterpart to Anomalies
      // (raw live errors): what's filed, unresolved, and needs an operator.
      if (nodeId === 'evt') {
        if (alertFindings.length === 0) {
          return (
            <div className="p-2">
              <p className="font-mono text-[9px] text-emerald-400/90">
                NO OPEN HIGH-SEVERITY FINDINGS.
              </p>
              <p className="mt-1 font-mono text-[8px] text-hud-dim">
                This hex crackles when a HIGH or CRITICAL finding is filed on
                the triage board and not yet resolved.
              </p>
            </div>
          );
        }
        return (
          <div className="max-h-full overflow-y-auto cc-scrollbar p-1">
            <p className="mb-1 font-mono text-[8px] tracking-[0.15em] text-rose-400">
              {alertFindings.length} OPEN HIGH-SEVERITY FINDING
              {alertFindings.length > 1 ? 'S' : ''}
            </p>
            {alertFindings.map((t) => {
              const lw = t?.log_watch || {};
              return (
                <div
                  key={t.pk || t.id}
                  className="mb-2 border-l-2 border-rose-500/50 pl-1.5"
                >
                  <p className="font-mono text-[8px] font-bold leading-[1.4] text-hud-text/90 break-words">
                    {t.title}
                  </p>
                  {lw.suggested_fix ? (
                    <div className="mt-1">
                      <p className="font-mono text-[6.5px] uppercase tracking-wider text-emerald-400/80">
                        Suggested fix
                        {lw.confidence ? ` · ${lw.confidence}` : ''}
                      </p>
                      <p className="font-mono text-[8px] leading-[1.5] text-hud-text/80 break-words">
                        {lw.suggested_fix}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-0.5 font-mono text-[7px] text-hud-dim">
                      No suggested fix yet.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      // AI context — show agent stats
      if (context === 'ai') {
        const agent = contextHexNodes.find((a) => a.id === nodeId);
        if (agent) {
          // Real backing agent (vs demo hex) — only real agents can carry
          // risk-gated capability toggles (the PATCH needs a real agent id).
          const realAgent = (activeAgentSessions || []).find(
            (s) => s?.sessionKind === 'agent' && String(s?.id) === String(nodeId)
          );
          const agentCaps =
            (realAgent && agentCapOverrides[realAgent.id]) ||
            realAgent?.sessionData?.config?.capabilities ||
            {};
          return (
            <div className="space-y-2 p-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[14px]">{agent.icon}</span>
                <span className="text-[10px] font-mono text-hud-text font-bold">
                  {agent.label}
                </span>
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 border"
                  style={{
                    color: STATUS_COLORS[agent.status],
                    borderColor: `${STATUS_COLORS[agent.status]}30`
                  }}
                >
                  {agent.status?.toUpperCase()}
                </span>
              </div>
              <S l="TASKS" v={agent.tasks} c="#2EDBE8" />
              <S
                l="STATUS"
                v={agent.status?.toUpperCase()}
                c={STATUS_COLORS[agent.status]}
              />
              {/* Risk-gated capabilities — Draft PRs unlocks the triage
                  agent's open_draft_pr tool (draft GitHub PRs for grounded
                  fixes). Only rendered for real agents. */}
              {realAgent && (
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-hud-line/10 pt-2">
                  <div>
                    <p className="text-[9px] font-mono text-hud-text">
                      DRAFT PRS
                    </p>
                    <p className="text-[7px] font-mono text-hud-dim">
                      Agent may open draft fix PRs on GitHub
                    </p>
                  </div>
                  <HudCheckbox
                    checked={agentCaps.open_draft_pr === true}
                    disabled={capSavingAgentId === realAgent.id}
                    size={15}
                    title={
                      agentCaps.open_draft_pr
                        ? 'Enabled — click to disable'
                        : 'Disabled — click to enable'
                    }
                    onChange={(next) =>
                      toggleDraftPrCapability(realAgent.id, next)
                    }
                  />
                </div>
              )}
              {panelId && (
                <button
                  type="button"
                  onClick={() => {
                    // Single-screen rule: "full" view is the drawer overlay,
                    // never a route away from the HUD.
                    setActiveHexPanel(null);
                    setActivePanel(panelId);
                  }}
                  className="text-[8px] font-mono text-hud-dim hover:text-hud-accent transition mt-2 border border-hud-line/10 px-2 py-1 w-full text-center"
                >
                  OPEN FULL →
                </button>
              )}
            </div>
          );
        }
      }

      // Projects context — show project details
      if (context === 'projects') {
        const project = contextHexNodes.find((p) => p.id === nodeId);
        if (project) {
          return (
            <div className="space-y-2 p-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[14px]">{project.icon}</span>
                <span className="text-[10px] font-mono text-hud-text font-bold">
                  {project.label}
                </span>
              </div>
              <S l="TASKS" v={project.tasks} c="#2EDBE8" />
              <S
                l="STATUS"
                v={project.status?.toUpperCase()}
                c={STATUS_COLORS[project.status]}
              />
            </div>
          );
        }
      }

      // Profile context
      if (context === 'profile') {
        const item = contextHexNodes.find((p) => p.id === nodeId);
        if (item) {
          return (
            <div className="space-y-2 p-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[14px]">{item.icon}</span>
                <span className="text-[10px] font-mono text-hud-text font-bold">
                  {item.label}
                </span>
              </div>
              <S l="COUNT" v={item.tasks} c="#2EDBE8" />
              {panelId && (
                <button
                  type="button"
                  onClick={() => {
                    // Single-screen rule: "full" view is the drawer overlay,
                    // never a route away from the HUD.
                    setActiveHexPanel(null);
                    setActivePanel(panelId);
                  }}
                  className="text-[8px] font-mono text-hud-dim hover:text-hud-accent transition mt-2 border border-hud-line/10 px-2 py-1 w-full text-center"
                >
                  OPEN FULL →
                </button>
              )}
            </div>
          );
        }
      }

      // Fallback
      return (
        <RestrictedArea
          title={panelId?.toUpperCase() || 'MODULE'}
          subtitle="COMING SOON"
          message="This panel is being built."
          variant="info"
          className="h-full"
        />
      );
    },
    [
      contextHexNodes,
      logErrorRecords,
      alertFindings,
      activeAgentSessions,
      agentCapOverrides,
      capSavingAgentId,
      toggleDraftPrCapability
    ]
  );

  return (
    <MobileGate>
      {/* Onboarding gate — blocking modal over the HUD (single-screen rule). */}
      {needsOnboarding && <OnboardingPage />}

      {/* Template preview — a template "file" opened from the Templates root. */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewTemplate(null);
          }}
        >
          <div
            className="flex h-[70vh] w-[64vw] max-w-3xl flex-col bg-cyan-500/30"
            style={{
              padding: '1.5px',
              clipPath:
                'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)'
            }}
          >
          <div
            className="flex flex-1 flex-col overflow-hidden bg-hud-surface/95 backdrop-blur-xl"
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)'
            }}
          >
            <div className="flex items-center justify-between border-b border-hud-line/[0.08] px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-wider text-hud-accent">
                  {previewTemplate.name}
                </span>
                <span className="border border-hud-line/20 px-1.5 py-0.5 font-mono text-[8px] text-hud-dim">
                  {previewTemplate.category}
                </span>
                {previewTemplate.scope === 'system' && (
                  <span className="border border-amber-500/20 px-1.5 py-0.5 font-mono text-[8px] text-amber-400/70">
                    SYSTEM
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftStudioSeed({
                      title: previewTemplate.name,
                      body_html: previewTemplate.body_html || ''
                    });
                    setPreviewTemplate(null);
                    setActivePanel('drafts');
                  }}
                  className="border border-hud-accent/40 bg-hud-accent/[0.08] px-2 py-1 font-mono text-[9px] font-bold tracking-wider text-hud-accent transition hover:bg-hud-accent/[0.15]"
                >
                  ⚡ DRAFT WITH AI
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  aria-label="Close preview"
                  className="px-1.5 py-0.5 font-mono text-[14px] leading-none text-hud-dim transition hover:bg-cyan-500/10 hover:text-hud-accent"
                >
                  ✕
                </button>
              </div>
            </div>
            {/* Tab strip — switch templates in place, no need to close. */}
            {allTemplates.length > 1 && (
              <div className="cc-scrollbar flex gap-1 overflow-x-auto border-b border-hud-line/[0.06] px-3 py-1.5">
                {allTemplates.map((t) => {
                  const active = t.id === previewTemplate.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPreviewTemplate(t)}
                      className={`flex-shrink-0 whitespace-nowrap px-2.5 py-1 font-mono text-[9px] tracking-wide transition ${
                        active
                          ? 'border border-hud-accent/40 bg-cyan-500/10 text-cyan-200'
                          : 'border border-transparent text-hud-dim hover:text-hud-accent hover:bg-cyan-500/[0.05]'
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
            {previewTemplate.description && (
              <p className="px-4 pt-2 font-mono text-[10px] text-hud-dim">
                {previewTemplate.description}
              </p>
            )}
            <div className="cc-scrollbar flex-1 overflow-auto p-5">
              {previewTemplate.preview?.body_html ? (
                <div
                  className="autosec-tpl-preview text-hud-text"
                  dangerouslySetInnerHTML={{
                    __html: previewTemplate.preview.body_html
                  }}
                />
              ) : (
                <p className="font-mono text-[11px] text-hud-dim">
                  No preview available for this template.
                </p>
              )}
            </div>
          </div>
          </div>
          <style>
            {`.autosec-tpl-preview h1{font-size:16px;font-weight:700;color:#2EDBE8;letter-spacing:.02em;margin:0 0 10px}
              .autosec-tpl-preview h2{font-size:12px;font-weight:600;color:#7dd3fc;margin:16px 0 4px;text-transform:uppercase;letter-spacing:.08em}
              .autosec-tpl-preview p{font-size:12px;line-height:1.5;color:#9ca3af;margin:0 0 8px}`}
          </style>
        </div>
      )}
      <div
        className={`fixed inset-0 z-50 overflow-hidden bg-hud-canvas ${
          isLight ? 'hud-light text-hud-text' : 'text-white'
        }`}
      >
        {/* ── Backgrounds (dark HUD only — Daylight uses a flat steel canvas) ── */}
        {isLight ? null : theme === 'space' ? (
          <React.Fragment>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 45%, #0a1628 0%, #050814 50%, #020309 100%)'
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(46,219,232,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(46,219,232,0.01) 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }}
            />
            <StarField count={140} />
          </React.Fragment>
        ) : (
          <div className="absolute inset-0 pointer-events-none">
            <OceanBackground />
          </div>
        )}

        {/* ── Grid: top bar + main + bottom ── */}
        <DndContext onDragEnd={handleDragEnd}>
          <div className="relative z-10 h-full grid grid-rows-[48px_auto_auto_1fr_auto_auto_auto_48px]">
            {/* ═══ TOP BAR ═══ */}
            <div className="flex items-center px-4 border-b border-hud-line/[0.06] gap-3">
              {/* Left: title + exit */}
              <div className="flex flex-col items-start flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping opacity-50" />
                  </div>
                  <span
                    className="text-[12px] font-bold tracking-[0.12em] font-mono"
                    style={{ color: '#2EDBE8' }}
                  >
                    AUTO-SEC
                  </span>
                  <span className="text-[8px] font-bold tracking-wider text-amber-400 border border-amber-500/15 px-1.5 py-0.5 font-mono">
                    V0.0.0
                  </span>
                </div>
              </div>

              {/* Center: search bar — full width */}
              <div className="flex-1 px-4">
                <HudSearch seedId={resolvedSeedId} />
              </div>

              {/* Right: status + controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {[
                  { l: 'AGT', v: 5, c: '#34d399' },
                  { l: 'ALR', v: donations?.length || 47, c: '#2EDBE8' },
                  { l: 'ANL', v: teams?.length || 4, c: '#7C4DFF' },
                  { l: 'HST', v: childrenTotal || 23, c: '#F59E0B' }
                ].map((s) => (
                  <div key={s.l} className="flex items-center gap-1">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: s.c }}
                    />
                    <span className="text-[10px] font-mono text-hud-dim">
                      {s.l}
                    </span>
                    <span
                      className="text-[10px] font-mono font-bold tabular-nums"
                      style={{ color: s.c }}
                    >
                      {s.v}
                    </span>
                  </div>
                ))}
                <div className="h-3 w-px bg-cyan-500/[0.06]" />
                <button
                  type="button"
                  onClick={() => {
                    setDraftStudioSeed(null);
                    setActivePanel('drafts');
                  }}
                  title="Reports — AI-assisted writing"
                  className="text-[9px] font-mono text-hud-dim hover:text-hud-accent transition border border-hud-line/10 px-1.5 py-0.5"
                >
                  ✎ REPORTS
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel('social')}
                  title="Operator feed"
                  className="text-[9px] font-mono text-hud-dim hover:text-hud-accent transition border border-hud-line/10 px-1.5 py-0.5"
                >
                  ⧉ FEED
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel('messaging')}
                  title="Direct messages"
                  className="text-[9px] font-mono text-hud-dim hover:text-hud-accent transition border border-hud-line/10 px-1.5 py-0.5"
                >
                  ✉ MSGS
                </button>
                <button
                  type="button"
                  onClick={toggleHudMode}
                  title={isLight ? 'Switch to dark' : 'Switch to daylight'}
                  className="text-[9px] font-mono text-hud-dim hover:text-hud-accent transition border border-hud-line/20 px-1.5 py-0.5"
                >
                  {isLight ? '☾ DARK' : '☀ LIGHT'}
                </button>
                {!isLight && (
                  <button
                    type="button"
                    onClick={() =>
                      setTheme((t) => (t === 'space' ? 'ocean' : 'space'))
                    }
                    className="text-[9px] font-mono text-hud-dim hover:text-hud-accent transition border border-hud-line/10 px-1.5 py-0.5"
                  >
                    {theme === 'space' ? '◈ OCEAN' : '✦ SPACE'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetPanelPositions}
                  className="text-[9px] font-mono text-hud-dim hover:text-amber-400 transition border border-hud-line/10 px-1.5 py-0.5"
                >
                  ↺ RESET
                </button>
              </div>
            </div>

            {/* ═══ TOP NAV — chamfered trapezoid bar ═══ */}
            <HudNavDrawer
              position="top"
              items={[
                { id: 'search', label: 'SEARCH' },
                { id: 'timeline', label: 'TIMELINE' },
                {
                  id: 'kanban',
                  label: 'KANBAN',
                  content: (
                    <div className="flex w-full justify-center">
                      <div className="h-[80vh] w-[92vw] overflow-hidden">
                        <HudKanbanBoard seedId={resolvedSeedId} />
                      </div>
                    </div>
                  )
                },
                {
                  id: 'logs',
                  label: 'LOGS',
                  content: (
                    <div className="flex w-full justify-center">
                      <div className="max-h-[74vh] w-[92vw] overflow-hidden">
                        <HudLogStreamContent variant="full" />
                      </div>
                    </div>
                  )
                },
                {
                  id: 'workflows',
                  label: 'WORKFLOWS',
                  content: (
                    <div className="flex w-full justify-center">
                      <div className="h-[74vh] w-[70vw] overflow-hidden">
                        <HudWorkflowsPanel />
                      </div>
                    </div>
                  )
                },
                {
                  id: 'predict',
                  label: 'FORECAST',
                  content: (
                    <div className="p-4 text-[10px] font-mono text-hud-dim">
                      Forecast panel content
                    </div>
                  )
                },
                { id: 'makePlan', label: 'MAKE PLAN' }
              ]}
            />

            {/* ═══ CONTEXT SUB-MENU ═══ */}
            <div className="flex items-center justify-center gap-1 py-1">
              {CONTEXT_ITEMS.map((ctx) => (
                <button
                  key={ctx.id}
                  type="button"
                  onClick={() => {
                    setActiveContext(ctx.id);
                    setActiveHexPanel(null);
                  }}
                  className={`text-[8px] font-mono tracking-[0.1em] px-3 py-0.5 transition border ${
                    activeContext === ctx.id
                      ? 'text-hud-accent border-hud-line/30 bg-cyan-500/[0.08]'
                      : 'text-hud-dim border-transparent hover:text-hud-accent hover:border-hud-line/10'
                  }`}
                >
                  {ctx.label}
                </button>
              ))}
            </div>

            {/* ═══ MAIN AREA — ring center, draggable panels ═══ */}
            <div className="relative overflow-visible flex">
              {/* Left: HudSideNav */}
              <HudSideNav
                className="flex-shrink-0 z-30"
                items={[
                  {
                    id: 'modules',
                    label: 'MODULES',
                    content: (
                      <div className="grid grid-cols-2 gap-[2px] p-2">
                        {PANELS.slice(0, 12).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setActivePanel(p.id)}
                            className="text-[9px] font-mono text-hud-dim hover:text-hud-accent hover:bg-cyan-500/[0.04] py-1.5 text-center transition border border-transparent hover:border-hud-line/10"
                          >
                            <span className="block text-[9px] mb-0.5">
                              {p.icon}
                            </span>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )
                  },
                  {
                    id: 'auth',
                    label: 'OPERATOR',
                    content: (
                      <div className="space-y-3 p-3">
                        {/* Profile header */}
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-12 w-12 flex-shrink-0 items-center justify-center bg-gradient-to-br from-[#0a1628] to-[#0d1f3c] font-mono text-[13px] font-bold text-hud-accent"
                            style={{
                              clipPath:
                                'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)'
                            }}
                          >
                            {(operatorLabel || 'OP').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-[12px] font-bold text-hud-text">
                              {operatorLabel.toUpperCase()}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              ONLINE
                            </p>
                          </div>
                        </div>
                        {/* Details — readable, ocean-blue labels */}
                        <div className="space-y-1.5 border-t border-hud-line/10 pt-2 font-mono text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-cyan-400/60">WORKSPACE</span>
                            <span className="truncate text-hud-text">
                              {workspaceName}
                            </span>
                          </div>
                          {storedUser?.email && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-cyan-400/60">EMAIL</span>
                              <span className="truncate text-hud-text">
                                {storedUser.email}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-cyan-400/60">SESSION</span>
                            <span className="text-emerald-400">ACTIVE</span>
                          </div>
                        </div>
                        {/* Actions → the real settings sections */}
                        <div className="flex flex-col gap-1 border-t border-hud-line/10 pt-2">
                          {[
                            { id: 'profile', label: 'Profile settings', icon: '◉' },
                            { id: 'security', label: 'Security & 2FA', icon: '⚿' },
                            { id: 'sessions', label: 'Active sessions', icon: '⟳' },
                            { id: 'members', label: 'Members & access', icon: '⚇' },
                            { id: 'audit', label: 'Login activity', icon: '▤' }
                          ].map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => openSettings(s.id)}
                              className="flex items-center gap-2 px-2 py-1.5 text-left font-mono text-[11px] text-hud-text transition hover:bg-cyan-500/[0.06] hover:text-hud-accent"
                            >
                              <span className="w-3 text-center text-cyan-400/70">
                                {s.icon}
                              </span>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  },
                  {
                    id: 'files',
                    label: 'FILES',
                    content: (
                      <div className="p-2 max-h-[60vh] overflow-y-auto cc-scrollbar">
                        {[
                          ...FILE_TREE,
                          ...(templatesRoot ? [templatesRoot] : [])
                        ].map((node, i) => (
                          <FileTreeNode
                            key={node.name + i}
                            node={node}
                            depth={0}
                            onFileClick={handleFileClick}
                          />
                        ))}
                      </div>
                    )
                  }
                ]}
              />
              {/* ── TOP-RIGHT: Profile badge (SHIELD OS style) ── */}
              {/* Hidden while the right drawer is open so it never floats over the flyout. */}
              <div
                className={`absolute right-2 -top-5 z-40 w-[260px] transition-opacity duration-200 ${
                  rightNavOpen
                    ? 'opacity-0 pointer-events-none'
                    : 'opacity-100'
                }`}
              >
                <div
                  className="flex items-stretch"
                  style={{
                    clipPath:
                      'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)'
                  }}
                >
                  {/* Pentagon avatar — layered so the cyan edge reads as a
                      visible border that follows the clip-path. */}
                  <div
                    className="w-16 h-16 flex-shrink-0 p-[1.5px]"
                    style={{
                      clipPath:
                        'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                      background:
                        'linear-gradient(135deg, rgba(46,219,232,0.6), rgba(46,219,232,0.18))'
                    }}
                  >
                    <div
                      className="w-full h-full bg-gradient-to-br from-[#0a1628] to-[#0d1f3c] flex items-center justify-center"
                      style={{
                        clipPath:
                          'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                        boxShadow: 'inset 0 0 16px rgba(46,219,232,0.14)'
                      }}
                    >
                      <HexEyeLogo className="h-9 w-9" />
                    </div>
                  </div>
                  {/* Info panel */}
                  <div className="flex-1 bg-hud-surface/85 backdrop-blur-sm px-3 pt-2.5 pb-2 border border-hud-line/[0.12] border-l-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className="text-[10px] font-mono font-bold tracking-[0.12em]"
                        style={{ color: '#2EDBE8' }}
                      >
                        AUTO-SEC OS
                      </span>
                      {/* Mini status bar */}
                      <div className="flex gap-[2px]">
                        <div className="w-4 h-1.5 bg-red-500/60" />
                        <div className="w-4 h-1.5 bg-red-500/40" />
                        <div className="w-2 h-1.5 bg-red-500/20" />
                      </div>
                    </div>
                    <p className="text-[8px] font-mono text-hud-dim mb-1">
                      V0.0.0 · {workspaceName}
                    </p>
                    <div className="border-t border-hud-line/10 pt-1">
                      <p className="text-[8px] font-mono text-hud-dim tracking-wider mb-0.5">
                        OPERATOR:
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-bold text-hud-text tracking-wide truncate">
                          {operatorLabel.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[9px] font-mono text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 bg-emerald-500/[0.05]">
                            ONLINE
                          </span>
                          <button
                            type="button"
                            onClick={handleBack}
                            title="Sign out"
                            aria-label="Sign out"
                            className="flex items-center gap-1 text-[9px] font-mono text-rose-300/80 hover:text-rose-200 border border-rose-500/30 hover:border-rose-400/50 bg-rose-500/[0.06] hover:bg-rose-500/[0.12] px-1.5 py-0.5 transition tracking-wider"
                          >
                            <FiLogOut size={9} /> SIGN OUT
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: ring + panels */}
              <div
                className="relative overflow-hidden flex-1"
                id="cc-main"
                ref={mainRef}
              >
                {/* Canvas ring system + lunar callouts */}
                <CoreCanvas
                  agents={contextHexNodes}
                  healthPct={98}
                  onHexClick={handleHexClick}
                  containerRef={mainRef}
                  detectionsPulseRef={detectionsPulseUntilRef}
                  logErrorsRef={logErrorsRef}
                  alertFindingsRef={alertFindingsRef}
                  centerLabel={CONTEXT_LABELS[activeContext]}
                  activeHexId={activeHexPanel?.nodeId}
                />

                {/* Slide-in hex panel + callout line */}
                <SlideInHexPanel
                  activeHexPanel={activeHexPanel}
                  containerRef={mainRef}
                  onClose={() => setActiveHexPanel(null)}
                  title={contextHexNodes
                    .find((n) => n.id === activeHexPanel?.nodeId)
                    ?.label?.toUpperCase()}
                >
                  {activeHexPanel && renderHexPanelContent(activeHexPanel)}
                </SlideInHexPanel>

                {/* Octopus logo — positioned below the health number, not overlapping */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[13]">
                  <div
                    className="-mt-24"
                    style={{
                      animation: 'cc-logo-pulse 4s ease-in-out infinite'
                    }}
                  >
                    <HexEyeLogo className="h-10 w-10" />
                  </div>
                </div>

                {/* Lunar callout lines are now built into each panel via <Callout> wrapper */}

                {/* ── LEFT PANELS ── */}
                {showPanel('leftPanels') && (
                  <DraggablePanel
                    id="leftPanels"
                    className="absolute left-2 top-[70px] w-[200px] flex flex-col gap-1 z-20"
                    offset={panelOffsets.leftPanels}
                    {...resizeProps('leftPanels')}
                  >
                    <Hud title={contextLeftPanel.title}>
                      {contextLeftPanel.stats.map((s) => (
                        <S key={s.l} l={s.l} v={s.v} c={s.c} />
                      ))}
                    </Hud>
                    <Hud title="SIGNALS">
                      <S
                        l="EVENTS"
                        v={incomeTotal ? fmt(incomeTotal) : TELEM.income}
                        c="#34d399"
                      />
                      <S
                        l="INCIDENTS"
                        v={expenseTotal ? fmt(expenseTotal) : TELEM.expenses}
                        c="#F59E0B"
                      />
                      <S
                        l="CRITICAL"
                        v={incomeTotal ? fmt(net) : TELEM.net}
                        c={net >= 0 ? '#34d399' : '#f87171'}
                      />
                      <S
                        l="ALERTS"
                        v={donations?.length || TELEM.donations}
                        c="#2EDBE8"
                      />
                    </Hud>
                    <Hud title="INCIDENTS">
                      {[
                        { l: 'Endpoint', v: 72, c: '#EC4899' },
                        { l: 'Network', v: 54, c: '#F59E0B' },
                        { l: 'Identity', v: 38, c: '#2EDBE8' },
                        { l: 'Cloud', v: 21, c: '#7C4DFF' }
                      ].map((b) => (
                        <div key={b.l} className="mb-0.5">
                          <div className="flex justify-between text-[9px] font-mono mb-[1px]">
                            <span className="text-hud-dim">{b.l}</span>
                            <span className="text-hud-dim tabular-nums">
                              {b.v}%
                            </span>
                          </div>
                          <div className="h-1 bg-gray-800/60 w-full">
                            <div
                              className="h-full"
                              style={{
                                width: `${b.v}%`,
                                backgroundColor: b.c,
                                boxShadow: `0 0 4px ${b.c}40`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </Hud>
                  </DraggablePanel>
                )}

                {/* ── CENTER-LEFT: Campaigns callout — anchored clear of the ring ── */}
                {showPanel('campaigns') && ringSideAnchors && (
                  <DraggablePanel
                    id="campaigns"
                    className="absolute z-20 w-[150px]"
                    style={ringSideAnchors.left}
                    offset={panelOffsets.campaigns}
                    {...resizeProps('campaigns')}
                  >
                    <Hud title="OPERATIONS">
                      {[
                        { name: 'Perimeter Sweep', pct: 72, c: '#EC4899' },
                        { name: 'Endpoint Scan', pct: 45, c: '#F59E0B' }
                      ].map((c) => (
                        <div key={c.name} className="mb-1">
                          <div className="flex justify-between text-[9px] font-mono">
                            <span className="text-hud-dim">{c.name}</span>
                            <span
                              style={{ color: c.c }}
                              className="tabular-nums"
                            >
                              {c.pct}%
                            </span>
                          </div>
                          <div className="h-[3px] bg-gray-800/60 w-full">
                            <div
                              className="h-full"
                              style={{
                                width: `${c.pct}%`,
                                backgroundColor: c.c,
                                boxShadow: `0 0 3px ${c.c}40`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </Hud>
                  </DraggablePanel>
                )}

                {/* ── CENTER-RIGHT: Sponsorship callout — anchored clear of the ring ── */}
                {showPanel('sponsorship') && ringSideAnchors && (
                  <DraggablePanel
                    id="sponsorship"
                    className="absolute z-20 w-[150px]"
                    style={ringSideAnchors.right}
                    offset={panelOffsets.sponsorship}
                    {...resizeProps('sponsorship')}
                  >
                    <Hud title="RECON">
                      <S l="ACTIVE" v="18" c="#F59E0B" />
                      <S l="HOSTS" v="23" c="#34d399" />
                      <S l="MONTHLY" v="2.4K" c="#2EDBE8" />
                    </Hud>
                  </DraggablePanel>
                )}

                {/* ── TOP-CENTER: System status bar (clickable) ── */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
                  <Hud>
                    <div className="flex items-center gap-2.5">
                      {[
                        { l: 'COMM', ok: true, panel: 'campaigns' },
                        { l: 'DATA', ok: true, panel: 'moneyFlow' },
                        { l: 'SYNC', ok: true, panel: 'workflows' },
                        { l: 'AI', ok: true, panel: 'predict' },
                        { l: 'NET', ok: true, panel: 'settings' },
                        { l: 'STRG', ok: false, panel: 'documents' },
                        { l: 'AUTH', ok: true, panel: 'auth' }
                      ].map((s) => (
                        <button
                          key={s.l}
                          type="button"
                          onClick={() => setActivePanel(s.panel)}
                          className="text-center hover:opacity-80 transition"
                        >
                          <p
                            className="text-[8px] font-mono tracking-wider"
                            style={{ color: s.ok ? '#34d399' : '#f87171' }}
                          >
                            {s.l}
                          </p>
                          <div
                            className="h-[3px] w-5 mt-[2px]"
                            style={{
                              backgroundColor: s.ok ? '#34d399' : '#f87171',
                              boxShadow: `0 0 4px ${
                                s.ok ? '#34d39960' : '#f8717160'
                              }`
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </Hud>
                </div>

                {/* ── BOTTOM-RIGHT: Recycle bin (JARVIS-style) ── */}
                <DraggablePanel
                  id="recycleBin"
                  className="absolute right-2 bottom-2 z-20 w-[200px]"
                  offset={panelOffsets.recycleBin}
                    {...resizeProps('recycleBin')}
                >
                  <div
                    className="relative border border-red-500/20 bg-black/50 backdrop-blur-sm cursor-pointer"
                    onClick={() => setRecycleBinOpen((v) => !v)}
                  >
                    {/* Header bar */}
                    <div className="flex items-center justify-between px-2 py-1 border-b border-red-500/15 bg-red-500/[0.03]">
                      <span className="text-[8px] font-mono text-red-500/60 tracking-wider">
                        RECYCLE BIN
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-red-500/30">
                          ▼
                        </span>
                        <FiTrash2 size={10} className="text-red-500/40" />
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex px-2 py-2 gap-3">
                      {/* Trash icon with grid */}
                      <div className="relative w-14 h-14 border border-red-500/10 bg-red-500/[0.02] flex items-center justify-center flex-shrink-0">
                        {/* Grid lines */}
                        <svg
                          className="absolute inset-0 w-full h-full"
                          viewBox="0 0 56 56"
                        >
                          {[14, 28, 42].map((v) => (
                            <React.Fragment key={v}>
                              <line
                                x1={v}
                                y1="0"
                                x2={v}
                                y2="56"
                                stroke="#f87171"
                                strokeWidth="0.3"
                                opacity="0.1"
                              />
                              <line
                                x1="0"
                                y1={v}
                                x2="56"
                                y2={v}
                                stroke="#f87171"
                                strokeWidth="0.3"
                                opacity="0.1"
                              />
                            </React.Fragment>
                          ))}
                        </svg>
                        <FiTrash2 size={22} className="text-red-500/50" />
                      </div>
                      {/* Status */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-mono text-hud-dim">
                            STATUS
                          </span>
                          <span className="text-[9px] font-mono text-red-400 border border-red-500/20 px-1.5 py-0.5 bg-red-500/[0.05]">
                            ARMED
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-[9px] font-mono text-hud-dim font-bold tabular-nums">
                              0 ITMS
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[9px] font-mono text-hud-dim font-bold tabular-nums">
                              0.0 B
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecycleBinOpen((v) => !v);
                          }}
                          className="mt-1 text-[9px] font-mono text-red-500/40 hover:text-red-400 transition border border-red-500/10 px-2 py-0.5 w-full text-center hover:bg-red-500/[0.05]"
                        >
                          {recycleBinOpen ? 'CLOSE' : 'EXPAND'}
                        </button>
                      </div>
                    </div>
                  </div>
                </DraggablePanel>

                {/* ── Recycle bin expanded panel + callout ── */}
                <AnimatePresence>
                  {recycleBinOpen && (
                    <React.Fragment key="recycle-expanded">
                      {/* Callout line: starts from recycle bin icon (top-right of card),
                          goes upward to the expanded panel bottom edge */}
                      <CalloutLine
                        hexX={(mainRef.current?.clientWidth || 0) - 12}
                        hexY={(mainRef.current?.clientHeight || 0) - 90}
                        endX={(mainRef.current?.clientWidth || 0) - 100}
                        endY={(mainRef.current?.clientHeight || 0) - 120}
                        color="#f87171"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 30
                        }}
                        className="absolute z-[30] bg-hud-surface/95 backdrop-blur-xl overflow-hidden flex flex-col"
                        style={{
                          right: 8,
                          bottom: 120,
                          width: 280,
                          height: 300,
                          clipPath: HUD_CLIP
                        }}
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-red-500/10">
                          <span className="text-[9px] font-mono text-red-500/60 tracking-[0.15em]">
                            RECYCLE BIN — CONTENTS
                          </span>
                          <button
                            type="button"
                            onClick={() => setRecycleBinOpen(false)}
                            className="text-hud-dim hover:text-red-400 transition"
                          >
                            <FiX size={10} />
                          </button>
                        </div>
                        <div className="flex-1 overflow-auto p-3 cc-scrollbar">
                          <div className="flex flex-col items-center justify-center h-full gap-3">
                            <FiTrash2 size={32} className="text-red-500/20" />
                            <p className="text-[10px] font-mono text-hud-dim">
                              Recycle bin is empty
                            </p>
                            <p className="text-[8px] font-mono text-hud-dim">
                              0 items · 0.0 B
                            </p>
                          </div>
                        </div>
                        <div className="px-3 py-2 border-t border-red-500/10 flex gap-2">
                          <button
                            type="button"
                            className="flex-1 text-[8px] font-mono text-red-500/40 hover:text-red-400 transition border border-red-500/10 py-1.5 text-center hover:bg-red-500/[0.05]"
                          >
                            EMPTY ALL
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecycleBinOpen(false)}
                            className="flex-1 text-[8px] font-mono text-hud-dim hover:text-hud-accent transition border border-hud-line/10 py-1.5 text-center hover:bg-cyan-500/[0.05]"
                          >
                            CLOSE
                          </button>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  )}
                </AnimatePresence>

                {/* ── BOTTOM-CENTER: Income trend waveform ── */}
                {showPanel('incomeTrend') && (
                  <DraggablePanel
                    id="incomeTrend"
                    className="absolute bottom-[3%] left-1/2 -translate-x-1/2 z-20 w-[200px]"
                    offset={panelOffsets.incomeTrend}
                    {...resizeProps('incomeTrend')}
                  >
                    <Hud
                      title="EVENT VOLUME"
                      fill={!!panelSizes.incomeTrend}
                    >
                      <div
                        className={
                          // Bars use % heights, so growing the row scales
                          // the whole chart with the resized card.
                          panelSizes.incomeTrend
                            ? 'flex items-end gap-[2px] flex-1 min-h-0'
                            : 'flex items-end gap-[2px] h-5'
                        }
                      >
                        {[
                          35, 42, 28, 55, 48, 62, 39, 71, 45, 58, 50, 67, 44,
                          73, 52, 60, 48, 55, 63, 70
                        ].map((v, i) => (
                          <div
                            key={i}
                            className="flex-1"
                            style={{
                              height: `${(v / 73) * 100}%`,
                              backgroundColor: '#2EDBE8',
                              boxShadow: '0 0 2px #2EDBE830',
                              opacity: 0.5 + (v / 73) * 0.5
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[9px] font-mono text-hud-dim">
                          JAN
                        </span>
                        <span className="text-[9px] font-mono text-hud-dim">
                          {seed?.name?.toUpperCase() || 'AUTO-SEC'}
                        </span>
                        <span className="text-[9px] font-mono text-hud-dim">
                          NOW
                        </span>
                      </div>
                    </Hud>
                  </DraggablePanel>
                )}

                {/* ── TOP-LEFT: Clock ── */}
                <DraggablePanel
                  id="clock"
                  className="absolute left-2 top-2 z-20 w-[150px]"
                  offset={panelOffsets.clock}
                    {...resizeProps('clock')}
                >
                  <Hud>
                    <p className="text-[14px] font-mono font-bold text-hud-text tabular-nums">
                      {currentTime.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                    <p className="text-[9px] font-mono text-hud-dim uppercase">
                      {currentTime.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </Hud>
                </DraggablePanel>

                {/* Search bar moved to top bar row */}

                {/* ── LOG STREAM — live SIEM tail from the connected AWS source ── */}
                {showPanel('logStream') && (
                  <DraggablePanel
                    id="logStream"
                    className="absolute left-2 bottom-[26vh] w-[240px] z-20"
                    offset={panelOffsets.logStream}
                    {...resizeProps('logStream')}
                  >
                    <Hud
                      title="LOG STREAM"
                      className={
                        // A user-set size wins over the default height cap so
                        // resizing actually reveals more of the tail.
                        panelSizes.logStream
                          ? 'min-h-0 overflow-hidden'
                          : 'max-h-[28vh] overflow-hidden'
                      }
                    >
                      <HudLogStreamContent fill={!!panelSizes.logStream} />
                    </Hud>
                  </DraggablePanel>
                )}

                {/* ── RIGHT PANELS ── */}
                {showPanel('rightPanels') && (
                  <DraggablePanel
                    id="rightPanels"
                    className="absolute right-2 top-[90px] w-[210px] flex flex-col gap-1 z-20"
                    offset={panelOffsets.rightPanels}
                    {...resizeProps('rightPanels')}
                  >
                    <Hud
                      title="ACTIVITY"
                      className={
                        panelSizes.rightPanels
                          ? 'min-h-0 overflow-hidden'
                          : 'max-h-[30vh] overflow-hidden'
                      }
                    >
                      {ACTIONS.map((a) => (
                        <Act key={a.id} {...a} />
                      ))}
                    </Hud>
                    <Hud title="CASES">
                      {[
                        { name: 'Brute Force', pct: 78, c: '#34d399' },
                        { name: 'Data Exfil', pct: 45, c: '#2EDBE8' },
                        { name: 'Ransomware', pct: 92, c: '#F59E0B' }
                      ].map((p) => (
                        <div key={p.name} className="mb-0.5">
                          <div className="flex justify-between text-[9px] font-mono">
                            <span className="text-hud-dim">{p.name}</span>
                            <span
                              style={{ color: p.c }}
                              className="tabular-nums"
                            >
                              {p.pct}%
                            </span>
                          </div>
                          <div className="h-1 bg-gray-800/60 w-full">
                            <div
                              className="h-full"
                              style={{
                                width: `${p.pct}%`,
                                backgroundColor: p.c,
                                boxShadow: `0 0 4px ${p.c}40`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </Hud>
                    <Hud title="SYSTEM">
                      <S l="UPTIME" v={TELEM.uptime} c="#34d399" />
                      <S l="LATENCY" v={TELEM.latency} c="#2EDBE8" />
                      <S l="ERRORS" v={TELEM.errors} c="#f87171" />
                    </Hud>
                  </DraggablePanel>
                )}

                {/* ── BOTTOM-LEFT: Modules grid ── */}
                <DraggablePanel
                  id="modules"
                  className="absolute left-2 bottom-3 z-20 w-[210px]"
                  offset={panelOffsets.modules}
                    {...resizeProps('modules')}
                >
                  <Hud title="MODULES">
                    <div className="grid grid-cols-4 gap-[2px]">
                      {PANELS.slice(0, 16).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setActivePanel(p.id)}
                          className="text-[9px] font-mono text-hud-dim hover:text-hud-accent hover:bg-cyan-500/[0.04] py-1 text-center transition border border-transparent hover:border-hud-line/10"
                        >
                          <span className="block text-[8px] mb-0.5">
                            {p.icon}
                          </span>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </Hud>
                </DraggablePanel>

                {/* ── CENTER-BOTTOM-LEFT: Upcoming events callout ── */}
                {showPanel('events') && (
                  <DraggablePanel
                    id="events"
                    className="absolute left-[24%] bottom-[18%] z-20 w-[145px]"
                    offset={panelOffsets.events}
                    {...resizeProps('events')}
                  >
                    <Hud title="ALERTS">
                      {[
                        { name: 'Auth 5xx Spike', date: 'Apr 20', ok: true },
                        { name: 'Port Scan', date: 'May 3', ok: false }
                      ].map((e) => (
                        <div
                          key={e.name}
                          className="flex items-center justify-between py-[2px]"
                        >
                          <div className="flex items-center gap-1">
                            <div
                              className="h-1 w-1 rounded-full"
                              style={{
                                backgroundColor: e.ok ? '#34d399' : '#F59E0B'
                              }}
                            />
                            <span className="text-[9px] font-mono text-hud-dim">
                              {e.name}
                            </span>
                          </div>
                          <span className="text-[8px] font-mono text-hud-dim">
                            {e.date}
                          </span>
                        </div>
                      ))}
                    </Hud>
                  </DraggablePanel>
                )}

                {/* ── CENTER-BOTTOM-RIGHT: Interactive file tree ── */}
                {showPanel('fileTree') && (
                  <DraggablePanel
                    id="fileTree"
                    className="absolute right-[20%] bottom-[10%] z-20 w-[210px]"
                    offset={panelOffsets.fileTree}
                    {...resizeProps('fileTree')}
                  >
                    <Hud title="\\LOGS" fill={!!panelSizes.fileTree}>
                      <div
                        className={
                          panelSizes.fileTree
                            ? 'flex-1 min-h-0 overflow-y-auto cc-scrollbar'
                            : 'max-h-[32vh] overflow-y-auto cc-scrollbar'
                        }
                      >
                        {FILE_TREE.map((node, i) => (
                          <FileTreeNode
                            key={node.name + i}
                            node={node}
                            depth={0}
                            onFileClick={() => setActivePanel('documents')}
                          />
                        ))}
                      </div>
                    </Hud>
                  </DraggablePanel>
                )}

                {/* ── Payment card panel ── */}
                {showPanel('paymentCard') && (
                  <DraggablePanel
                    id="paymentCard"
                    className="absolute left-[2%] bottom-[8%] z-30"
                    offset={panelOffsets.paymentCard}
                  >
                    <div style={{ width: 260, height: 165 }}>
                      <HudPaymentCard
                        card={{
                          brand: 'visa',
                          last4: '4242',
                          exp_month: 12,
                          exp_year: 2027,
                          is_default: true
                        }}
                        size="sm"
                      />
                    </div>
                  </DraggablePanel>
                )}

                {/* ── Prompt quality panel (Wave 4) ── */}
                {showPanel('promptQuality') && (
                  <DraggablePanel
                    id="promptQuality"
                    className="absolute right-[22%] bottom-[6%] z-20 w-[260px]"
                    offset={panelOffsets.promptQuality}
                    {...resizeProps('promptQuality')}
                  >
                    <HudPromptQualityPanel />
                  </DraggablePanel>
                )}
              </div>
              {/* Right: HudSideNav (mirrored) */}
              <HudSideNav
                side="right"
                onOpenChange={setRightNavOpen}
                className="flex-shrink-0 z-30"
                items={[
                  {
                    id: 'actions',
                    label: 'ACTIONS',
                    content: (
                      <div className="p-2 text-[8px] font-mono text-hud-dim space-y-1">
                        {ACTIONS.slice(0, 6).map((a) => (
                          <div key={a.id} className="flex items-center gap-1.5">
                            <div
                              className="h-1 w-1 rounded-full"
                              style={{
                                backgroundColor:
                                  STATUS_COLORS[a.status] || '#6B7280'
                              }}
                            />
                            <span className="truncate">{a.title}</span>
                          </div>
                        ))}
                      </div>
                    )
                  },
                  {
                    id: 'settings',
                    label: 'SETTINGS',
                    content: (
                      <div className="p-2 font-mono">
                        <p className="text-[9px] text-hud-dim tracking-[0.15em] mb-2 px-1">
                          ACCOUNT &amp; ORG
                        </p>
                        <div className="space-y-1">
                          {[
                            { id: 'profile', label: 'Profile', icon: '◉' },
                            {
                              id: 'security',
                              label: 'Security & 2FA',
                              icon: '⚿'
                            },
                            { id: 'sessions', label: 'Sessions', icon: '⟳' },
                            { id: 'audit', label: 'Audit Log', icon: '▤' }
                          ].map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => openSettings(s.id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-hud-text hover:text-hud-accent hover:bg-cyan-500/[0.06] border border-transparent hover:border-hud-line/20 transition text-left"
                            >
                              <span className="text-cyan-400/70 w-3 text-center">
                                {s.icon}
                              </span>
                              {s.label}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-hud-line/10 mt-2 pt-2 px-1">
                          <p className="text-[9px] text-hud-dim tracking-[0.15em] mb-1">
                            PREFERENCES
                          </p>
                          <p className="text-[10px] text-hud-dim">
                            Theme: {theme}
                          </p>
                        </div>
                      </div>
                    )
                  },
                  {
                    id: 'stats',
                    label: 'STATS',
                    content: (
                      <div className="p-3 text-[8px] font-mono text-hud-dim space-y-1">
                        <p>
                          UPTIME:{' '}
                          <span className="text-emerald-400">99.7%</span>
                        </p>
                        <p>
                          LATENCY: <span className="text-hud-accent">42ms</span>
                        </p>
                        <p>
                          ERRORS: <span className="text-red-400">2</span>
                        </p>
                      </div>
                    )
                  }
                ]}
              />
            </div>

            {/* ═══ BOTTOM NAV — chamfered trapezoid bar ═══ */}
            <HudNavDrawer
              position="top"
              items={[
                {
                  id: 'auth',
                  label: 'AUTH',
                  content: (
                    <div className="p-4 text-[10px] font-mono text-hud-dim">
                      Auth panel
                    </div>
                  )
                },
                {
                  id: 'modules',
                  label: 'MODULES',
                  content: (
                    <div className="p-4 text-[10px] font-mono text-hud-dim">
                      Modules panel
                    </div>
                  )
                },
                {
                  id: 'files',
                  label: 'FILES',
                  content: (
                    <div className="p-4 text-[10px] font-mono text-hud-dim">
                      Files panel
                    </div>
                  )
                }
              ]}
            />

            {/* ═══ VOICE INPUT — slides up above chat bar ═══ */}
            <HudVoiceModal
              isOpen={voiceOpen}
              isListening={voice.isListening}
              transcript={voice.transcript}
              error={voice.error}
              analyser={voice.analyser}
              onStart={voice.start}
              onStop={voice.stop}
              onInsert={(text) => {
                setChatInput((prev) => (prev ? prev + ' ' + text : text));
                voice.resetTranscript();
                setVoiceOpen(false);
              }}
              onClose={() => {
                voice.stop();
                setVoiceOpen(false);
              }}
            />

            {/* ═══ CHAT HISTORY — slides up above chat bar ═══ */}
            <HudChatPanel
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
              chat={chat}
            />

            {/* ═══ BOTTOM — CHAT BAR ═══ */}
            <div className="flex items-center gap-4 px-5 py-1 border-t border-hud-line/[0.06] bg-black/40 backdrop-blur-md">
              <HexEyeLogo className="h-5 w-5 flex-shrink-0" />
              <span className="text-[9px] font-mono text-cyan-500/30 tracking-wider flex-shrink-0">
                AUTO-SEC
              </span>
              <div className="h-4 w-px bg-cyan-500/[0.06]" />
              <form
                onSubmit={handleChatSubmit}
                className="flex-1 flex items-center relative"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Auto-Sec anything"
                  autoFocus
                  className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none focus:border-none text-[13px] font-mono text-hud-text caret-cyan-500 placeholder-gray-700"
                />
                {/* Native placeholder handles the "Ask Auto-Sec anything" text */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setVoiceOpen(true)}
                    className="text-cyan-500/30 hover:text-hud-accent transition"
                  >
                    <FiMic size={16} />
                  </button>
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="text-cyan-500/30 hover:text-hud-accent disabled:text-gray-800 transition"
                  >
                    <FiSend size={16} />
                  </button>
                  <span className="text-[10px] font-mono text-hud-dim flex-shrink-0">
                    ENTER ↵
                  </span>
                </div>
              </form>
            </div>

            {/* Voice panel moved above chat bar */}
          </div>
        </DndContext>

        {/* Chat panel moved inside grid — see before chat bar */}

        {/* ── Feature panel overlay ── */}
        {activePanel && (
          <div
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActivePanel(null);
            }}
          >
            <div className="w-[70vw] max-w-4xl h-[60vh] border border-hud-line/[0.08] bg-hud-surface/95 backdrop-blur-xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-hud-line/[0.06]">
                <span className="text-[9px] font-mono font-semibold text-hud-dim tracking-wider">
                  {PANELS.find((p) => p.id === activePanel)?.label ||
                    activePanel.toUpperCase()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePanel(null)}
                    className="text-hud-dim hover:text-hud-text transition"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {(activePanel === 'moneyFlow' || activePanel === 'predict') &&
                resolvedSeedId ? (
                  <PredictableMoneyFlow
                    workspaceId={resolvedSeedId}
                    showPeriodToggle={activePanel === 'moneyFlow'}
                  />
                ) : activePanel === 'documents' ? (
                  /* ── FILES panel — grid of documents and receipts ── */
                  <div>
                    {/* Sub-tabs */}
                    <div className="flex gap-1 mb-3">
                      {[
                        {
                          id: 'all',
                          label: 'ALL',
                          count:
                            filesData.documents.length +
                            filesData.receipts.length
                        },
                        {
                          id: 'docs',
                          label: 'ARTIFACTS',
                          count: filesData.documents.length
                        },
                        {
                          id: 'receipts',
                          label: 'LOGS',
                          count: filesData.receipts.length
                        }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          className="text-[8px] font-mono text-hud-dim hover:text-hud-accent transition border border-hud-line/10 px-2 py-1 hover:bg-cyan-500/[0.04]"
                        >
                          {tab.label}
                          <span className="ml-1 text-hud-dim">
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                    {filesData.loading ? (
                      <div className="flex items-center justify-center h-40">
                        <span className="text-[10px] font-mono text-hud-dim animate-pulse">
                          LOADING FILES...
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {/* Receipts */}
                        {filesData.receipts.map((r) => (
                          <a
                            key={r.id}
                            href={r.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-hud-line/10 bg-black/30 p-2 hover:bg-cyan-500/[0.04] hover:border-hud-line/20 transition group"
                          >
                            <span className="block text-[10px] mb-1">▤</span>
                            <span className="text-[8px] font-mono text-hud-dim group-hover:text-hud-accent block truncate">
                              {r.receipt_number}
                            </span>
                            <span className="text-[9px] font-mono text-hud-dim block">
                              {r.context?.toUpperCase()}
                            </span>
                            <span className="text-[9px] font-mono text-hud-dim block">
                              {r.generated_at
                                ? new Date(r.generated_at).toLocaleDateString()
                                : ''}
                            </span>
                          </a>
                        ))}
                        {/* Documents */}
                        {filesData.documents.map((d) => (
                          <a
                            key={d.id}
                            href={d.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-hud-line/10 bg-black/30 p-2 hover:bg-cyan-500/[0.04] hover:border-hud-line/20 transition group"
                          >
                            <span className="block text-[10px] mb-1">
                              {d.file_type === 'pdf' ? '▧' : '◈'}
                            </span>
                            <span className="text-[8px] font-mono text-hud-dim group-hover:text-hud-accent block truncate">
                              {d.filename || d.original_filename || 'File'}
                            </span>
                            <span className="text-[9px] font-mono text-hud-dim block">
                              {d.source?.toUpperCase() ||
                                d.file_type?.toUpperCase()}
                            </span>
                            <span className="text-[9px] font-mono text-hud-dim block">
                              {d.created
                                ? new Date(d.created).toLocaleDateString()
                                : ''}
                            </span>
                          </a>
                        ))}
                        {filesData.documents.length === 0 &&
                          filesData.receipts.length === 0 && (
                            <div className="col-span-4 text-center py-8">
                              <span className="text-[10px] font-mono text-hud-dim">
                                No files found for this workspace
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ) : activePanel === 'kanban' ? (
                  /* ── KANBAN panel — SOC triage board (HUD-native, reuses V2
                     components + the shared KanbanBoardContext). Findings the
                     triage agent assigns to team members land here. ── */
                  <HudKanbanBoard seedId={resolvedSeedId} />
                ) : activePanel === 'settings' ? (
                  /* ── SETTINGS panel — profile / security (2FA) / sessions,
                     as an overlay on the single HUD (never a separate route;
                     see .claude/rules/single-screen-hud.md). ── */
                  <SettingsPanel
                    key={settingsSection}
                    initialSection={settingsSection}
                  />
                ) : activePanel === 'messaging' ? (
                  /* ── MESSAGING panel — operator-to-operator direct messages
                     (HUD-native, single-screen overlay). ── */
                  <HudMessagingPanel />
                ) : activePanel === 'drafts' ? (
                  /* ── REPORTS panel — writing drafts + grounded AI assist
                     (draft-with-ai through the writing agent). ── */
                  <HudDraftStudio
                    key={draftStudioSeed ? 'seeded' : 'plain'}
                    seedTemplate={draftStudioSeed}
                  />
                ) : activePanel === 'social' ? (
                  /* ── SOCIAL panel — operator feed (posts/comments), gated by
                     feature.social_feed server-side. ── */
                  <HudSocialPanel />
                ) : activePanel === 'auth' ? (
                  /* ── AUTH panel — RSI-style login form ── */
                  <div className="flex items-center justify-center h-full">
                    <div className="w-full max-w-sm">
                      {/* Main card — chamfered top-right */}
                      <div
                        className="border border-[#3a3f35]/60 bg-[#1a1e16]/90 p-6"
                        style={{
                          clipPath: `polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)`
                        }}
                      >
                        <h2 className="text-[20px] font-mono text-hud-text mb-5">
                          Sign into Octopi
                        </h2>

                        <label className="text-[13px] font-mono text-hud-text block mb-1.5">
                          Email
                        </label>
                        <div className="border border-[#3a3f35]/50 bg-[#2a2f25]/60 mb-5 flex items-center">
                          <input
                            type="email"
                            placeholder="user@domain.com"
                            className="flex-1 bg-transparent px-3 py-3 text-[13px] font-mono text-hud-text placeholder-gray-600 outline-none"
                          />
                          <span className="px-3 text-hud-dim">⋯</span>
                        </div>

                        <label className="text-[13px] font-mono text-hud-text block mb-1.5">
                          Password
                        </label>
                        <div className="border border-[#3a3f35]/50 bg-[#2a2f25]/60 mb-5 flex items-center">
                          <input
                            type="password"
                            placeholder="Enter your password"
                            className="flex-1 bg-transparent px-3 py-3 text-[13px] font-mono text-hud-text placeholder-gray-600 outline-none"
                          />
                          <span className="px-2 text-hud-dim">⋯</span>
                          <span className="px-2 text-hud-dim">◉</span>
                        </div>

                        <div className="flex items-center gap-2 mb-5">
                          <div className="h-4 w-4 border border-[#3a3f35] bg-[#2a2f25]/40" />
                          <span className="text-[11px] font-mono text-hud-dim">
                            Remember me
                          </span>
                        </div>

                        <div className="flex justify-end">
                          <HudButton variant="primary" className="px-8">
                            SIGN IN
                          </HudButton>
                        </div>
                      </div>

                      {/* Bottom action buttons */}
                      <div className="flex gap-3 mt-3">
                        <HudButton variant="secondary" fullWidth icon="🔒">
                          Account Recovery
                        </HudButton>
                        <HudButton variant="secondary" fullWidth icon="→">
                          Enlist Now
                        </HudButton>
                      </div>

                      <p className="text-center text-[8px] font-mono text-emerald-500/30 mt-4 tracking-wider">
                        ■ ■ SECURE CONNECTION ESTABLISHED
                      </p>
                    </div>
                  </div>
                ) : (
                  <RestrictedArea
                    title={
                      PANELS.find((p) => p.id === activePanel)?.label ||
                      activePanel?.toUpperCase() ||
                      'MODULE'
                    }
                    subtitle="UNDER CONSTRUCTION"
                    message="This module is being built for the V2 command center."
                    variant="info"
                    className="h-full"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        <style>{`
        .cc-scrollbar::-webkit-scrollbar { width: 8px; }
        .cc-scrollbar::-webkit-scrollbar-track { background: rgba(46,219,232,0.04); border: 1px solid rgba(46,219,232,0.08); }
        .cc-scrollbar::-webkit-scrollbar-thumb { background: rgba(46,219,232,0.25); border-radius: 0; }
        .cc-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(46,219,232,0.45); }
        .cc-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(46,219,232,0.25) rgba(46,219,232,0.04); }
        @keyframes cc-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes cc-twinkle { 0% { opacity: 0.05; } 100% { opacity: 0.6; } }
        @keyframes cc-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes cc-orbit-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes cc-logo-pulse {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(46,219,232,0.1)); }
          50% { filter: drop-shadow(0 0 30px rgba(46,219,232,0.25)) drop-shadow(0 0 50px rgba(255,174,0,0.06)); }
        }
      `}</style>
      </div>
    </MobileGate>
  );
};

export default CommandCenterV2;
