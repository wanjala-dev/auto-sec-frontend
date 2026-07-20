/**
 * V2 Command Center shared constants, demo data, and configuration.
 */

export const STATUS_COLORS = {
  running: '#34d399',
  active: '#2EDBE8',
  pending: '#F59E0B',
  completed: '#8B5CF6',
  idle: '#6B7280',
  queued: '#F97316',
  failed: '#f87171'
};

export const CHAMFER = 14;
export const HUD_CLIP = `polygon(0 0, calc(100% - ${CHAMFER}px) 0, 100% ${CHAMFER}px, 100% 100%, 0 100%)`;

export const DEMO_AGENTS = [
  { id: 'fin', label: 'Log Intel', status: 'running', icon: '≡', tasks: 142 },
  { id: 'don', label: 'Threat Hunt', status: 'active', icon: '⌖', tasks: 89 },
  { id: 'spo', label: 'Recon', status: 'running', icon: '★', tasks: 67 },
  { id: 'tsk', label: 'Triage', status: 'completed', icon: '✓', tasks: 234 },
  { id: 'prj', label: 'Investigate', status: 'pending', icon: '◆', tasks: 56 },
  { id: 'evt', label: 'Alerts', status: 'active', icon: '⚡', tasks: 38 },
  { id: 'rpt', label: 'Detections', status: 'running', icon: '▤', tasks: 71 },
  { id: 'com', label: 'Comms', status: 'queued', icon: '◎', tasks: 23 },
  { id: 'wrk', label: 'Playbooks', status: 'running', icon: '⟐', tasks: 95 },
  { id: 'mkt', label: 'Intel Feeds', status: 'idle', icon: '◫', tasks: 12 }
];

export const DEMO_ACTIONS = [
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

export const DEMO_TELEMETRY = {
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

export const PANELS = [
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

export const FILE_TREE = [
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
      {
        name: 'templates',
        type: 'folder',
        children: [
          { name: 'containment.yml', type: 'doc' },
          { name: 'egress_flow.pcap', type: 'spreadsheet' }
        ]
      },
      { name: 'imports', type: 'folder', children: [] }
    ]
  }
];

export const HUD_CLIP_SM = `polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)`;

export const CYAN = '#2EDBE8';
export const PINK = '#E84D8A';
export const PURPLE = '#8B5CF6';

export const DEMO_DONUT_SPENDING = [
  { label: 'Network', value: 5400, color: '#2EDBE8' },
  { label: 'Endpoint', value: 2100, color: '#F59E0B' },
  { label: 'Identity', value: 800, color: '#8B5CF6' },
  { label: 'Cloud', value: 600, color: '#E84D8A' }
];

export const DEMO_DONUT_INCOME = [
  { label: 'CloudWatch', value: 7200, color: '#34d399' },
  { label: 'Sentry', value: 3600, color: '#2EDBE8' },
  { label: 'Syslog', value: 1800, color: '#F59E0B' },
  { label: 'EDR', value: 2400, color: '#8B5CF6' }
];

export const DEMO_KANBAN_COLUMNS = [
  {
    id: 'todo',
    title: 'TO DO',
    cards: [
      { id: 'k1', title: 'Review 5xx alert spike', tag: 'Triage', priority: 'high' },
      {
        id: 'k2',
        title: 'Enrich flagged IOCs',
        tag: 'Intel',
        priority: 'medium'
      }
    ]
  },
  {
    id: 'doing',
    title: 'DOING',
    cards: [
      {
        id: 'k3',
        title: 'Hunt lateral movement',
        tag: 'Response',
        priority: 'high'
      },
      {
        id: 'k4',
        title: 'Tune correlation rule',
        tag: 'Detections',
        priority: 'low'
      }
    ]
  },
  {
    id: 'done',
    title: 'DONE',
    cards: [
      {
        id: 'k5',
        title: 'Execute containment playbook',
        tag: 'Incidents',
        priority: 'high'
      },
      {
        id: 'k6',
        title: 'Dispatch detection report',
        tag: 'Reporting',
        priority: 'medium'
      }
    ]
  }
];

export const DEMO_TIMELINE_GROUPS = [
  {
    label: 'Endpoint',
    items: [
      {
        id: 'tl1',
        label: 'EDR Rollout',
        start: '2026-04-01',
        end: '2026-04-20'
      },
      {
        id: 'tl2',
        label: 'Host Hardening',
        start: '2026-04-10',
        end: '2026-05-05'
      }
    ]
  },
  {
    label: 'Network',
    items: [
      {
        id: 'tl3',
        label: 'Perimeter Scan',
        start: '2026-04-05',
        end: '2026-04-25'
      },
      {
        id: 'tl4',
        label: 'Egress Monitoring',
        start: '2026-04-15',
        end: '2026-05-10'
      }
    ]
  },
  {
    label: 'Infrastructure',
    items: [
      {
        id: 'tl5',
        label: 'Log Pipeline Buildout',
        start: '2026-04-01',
        end: '2026-05-15'
      }
    ]
  }
];

/* ── Context-aware ring navigation ── */

export const CONTEXT_ITEMS = [
  { id: 'ai', label: 'AGENTS' },
  { id: 'projects', label: 'CASES' },
  { id: 'files', label: 'LOGS' },
  { id: 'profile', label: 'OPERATOR' }
];

export const CONTEXT_HEX_NODES = {
  ai: DEMO_AGENTS,
  projects: [
    { id: 'edu', label: 'Brute Force', status: 'running', icon: '▧', tasks: 12 },
    { id: 'hlt', label: 'Data Exfil', status: 'active', icon: '◈', tasks: 8 },
    { id: 'inf', label: 'Malware', status: 'pending', icon: '⟐', tasks: 5 },
    { id: 'out', label: 'Phishing', status: 'running', icon: '◎', tasks: 15 },
    { id: 'grn', label: 'Recon', status: 'completed', icon: '▤', tasks: 3 },
    { id: 'vol', label: 'Insider', status: 'active', icon: '★', tasks: 9 }
  ],
  files: [
    { id: 'docs', label: 'Artifacts', status: 'active', icon: '▧', tasks: 14 },
    { id: 'rcpt', label: 'Auth Logs', status: 'active', icon: '▤', tasks: 7 },
    { id: 'expo', label: 'Exports', status: 'running', icon: '↗', tasks: 5 },
    { id: 'tmpl', label: 'Playbooks', status: 'idle', icon: '◈', tasks: 3 },
    { id: 'impt', label: 'Ingest', status: 'idle', icon: '↙', tasks: 0 }
  ],
  profile: [
    { id: 'actv', label: 'Activity', status: 'running', icon: '◎', tasks: 47 },
    { id: 'team', label: 'Analysts', status: 'active', icon: '⟐', tasks: 4 },
    { id: 'pref', label: 'Settings', status: 'idle', icon: '⚙', tasks: 0 },
    { id: 'ntfy', label: 'Alerts', status: 'active', icon: '⚡', tasks: 12 },
    { id: 'sess', label: 'Sessions', status: 'running', icon: '◆', tasks: 3 },
    { id: 'keys', label: 'API Keys', status: 'idle', icon: '★', tasks: 2 }
  ]
};

export const CONTEXT_HEX_CLICK_MAP = {
  ai: {
    fin: 'budget',
    don: 'donations',
    spo: 'sponsorship',
    tsk: 'tasks',
    prj: 'moneyFlow',
    evt: 'events',
    rpt: 'reports',
    com: 'campaigns',
    wrk: 'workflows',
    mkt: 'marketplace'
  },
  projects: {
    edu: 'tasks',
    hlt: 'tasks',
    inf: 'tasks',
    out: 'campaigns',
    grn: 'documents',
    vol: 'teams'
  },
  files: {
    docs: 'documents',
    rcpt: 'documents',
    expo: 'documents',
    tmpl: 'documents',
    impt: 'documents'
  },
  profile: {
    actv: 'reports',
    team: 'teams',
    pref: 'settings',
    ntfy: 'events',
    sess: 'auth',
    keys: 'settings'
  }
};

export const CONTEXT_LABELS = {
  ai: 'SYSTEM HEALTH',
  projects: 'ACTIVE CASES',
  files: 'LOG SOURCES',
  profile: 'OPERATOR'
};

// Which draggable panels are visible per context
// Panels not listed here are global (always visible): clock, systemStatus, modules, recycleBin
export const CONTEXT_PANELS = {
  ai: [
    'leftPanels',
    'campaigns',
    'sponsorship',
    'incomeTrend',
    'events',
    'paymentCard',
    'promptQuality',
    'logStream',
    'rightPanels'
  ],
  projects: ['leftPanels', 'campaigns', 'events', 'rightPanels'],
  files: ['leftPanels', 'fileTree', 'rightPanels'],
  profile: ['leftPanels', 'paymentCard', 'rightPanels', 'incomeTrend']
};

// Wave 4 of the prompt-evaluation plan — V2 Command Center panel
// registry. Each entry is `{ id, label, defaultVisible, requiresAdmin }`.
// The Command Center page reads these to mount the matching panel
// component inside a DraggablePanel via `showPanel(id)`.
export const V2_PANEL_REGISTRY = [
  {
    id: 'promptQuality',
    label: 'PROMPT QUALITY',
    defaultVisible: true,
    requiresAdmin: true
  }
];

// Maps file hex IDs to folder names in FILE_TREE
export const FILE_HEX_FOLDER_MAP = {
  docs: 'documents',
  rcpt: 'receipts',
  expo: 'exports',
  tmpl: 'templates',
  impt: 'imports'
};

// Compute slide-in panel position from hex angle and container dimensions.
// For left/right hexes: panel extends outward horizontally (works naturally).
// For top/bottom hexes: panel routes sideways to avoid overlap with the ring.
export function computeHexPanelPlacement(angle, containerW, containerH) {
  const PANEL_W = 300;
  const PANEL_H = 260;
  const EDGE = 8;

  const cx = containerW / 2;
  const cy = containerH / 2;
  const scale = Math.min(containerW, containerH);
  const hexR = scale * 0.38; // R.agentOrbit

  // The centre core (rings, health, label) is the HUD's primary display and
  // must never be covered. Keep the panel rect fully outside this radius:
  // the data rings end at 0.33, the hex orbit sits at 0.38.
  const CLEAR_R = scale * 0.34;

  const hexX = cx + hexR * Math.cos(angle);
  const hexY = cy + hexR * Math.sin(angle);

  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);

  const isHorizontal = Math.abs(dirX) >= Math.abs(dirY);
  const calloutLen = scale * 0.12;

  let panelLeft, panelTop, slideFrom;

  if (isHorizontal) {
    // Left/right hexes — callout goes outward, panel at the end
    const anchorX = hexX + dirX * calloutLen;
    const anchorY = hexY + dirY * calloutLen;
    panelLeft = dirX > 0 ? anchorX : anchorX - PANEL_W;
    panelTop = anchorY - PANEL_H / 2;
    slideFrom = { x: dirX * 40, y: 0 };
  } else {
    // Top/bottom hexes — route the callout sideways
    // Pick the side with more room
    const goRight = hexX <= cx;
    const sideDir = goRight ? 1 : -1;
    const anchorX = hexX + sideDir * calloutLen;
    const anchorY = hexY + dirY * (calloutLen * 0.3);
    panelLeft = goRight ? anchorX : anchorX - PANEL_W;
    panelTop = anchorY - PANEL_H / 2;
    slideFrom = { x: sideDir * 40, y: 0 };
  }

  // Clamp within container
  const clampLeft = (v) =>
    Math.max(EDGE, Math.min(v, containerW - PANEL_W - EDGE));
  const clampTop = (v) =>
    Math.max(EDGE, Math.min(v, containerH - PANEL_H - EDGE));
  panelLeft = clampLeft(panelLeft);
  panelTop = clampTop(panelTop);

  // Signed offset from the core centre to the panel rect's nearest point
  const nearDx = (l) => Math.max(l, Math.min(cx, l + PANEL_W)) - cx;
  const nearDy = (t) => Math.max(t, Math.min(cy, t + PANEL_H)) - cy;
  // Half-width of the clear circle at a given perpendicular offset
  const chord = (d) => Math.sqrt(Math.max(0, CLEAR_R * CLEAR_R - d * d));

  // If the natural placement (or the container clamp) put the rect over the
  // core, push it back out along whichever axis resolves with the least
  // movement while still fitting the container.
  if (Math.hypot(nearDx(panelLeft), nearDy(panelTop)) < CLEAR_R) {
    const pushRight = panelLeft + PANEL_W / 2 >= cx;
    const pushDown = panelTop + PANEL_H / 2 >= cy;

    const needX = chord(nearDy(panelTop));
    const hLeft = pushRight ? cx + needX : cx - needX - PANEL_W;
    const needY = chord(nearDx(panelLeft));
    const vTop = pushDown ? cy + needY : cy - needY - PANEL_H;

    const hFits = hLeft >= EDGE && hLeft <= containerW - PANEL_W - EDGE;
    const vFits = vTop >= EDGE && vTop <= containerH - PANEL_H - EDGE;
    const hMove = Math.abs(hLeft - panelLeft);
    const vMove = Math.abs(vTop - panelTop);

    if (hFits && (!vFits || hMove <= vMove)) {
      panelLeft = hLeft;
    } else if (vFits) {
      panelTop = vTop;
    } else {
      // Container too small to fully clear the core — take the corner
      // furthest away from it.
      panelLeft = clampLeft(pushRight ? containerW : 0);
      panelTop = clampTop(pushDown ? containerH : 0);
    }
  }

  // Cap dynamic content growth so a tall panel can't grow down into the
  // core. Only bites when the panel sits above the core within its x-range.
  const dxFinal = Math.abs(nearDx(panelLeft));
  let maxBottom = containerH - EDGE;
  if (dxFinal < CLEAR_R && panelTop + PANEL_H / 2 < cy) {
    maxBottom = Math.min(maxBottom, cy - chord(dxFinal));
  }
  const panelMaxH = Math.max(
    PANEL_H,
    Math.min(520, containerH * 0.7, maxBottom - panelTop)
  );

  // Land the callout on the panel edge nearest the hex so the line stays
  // attached wherever the panel ends up.
  const endX = Math.max(panelLeft, Math.min(hexX, panelLeft + PANEL_W));
  const endY = Math.max(panelTop, Math.min(hexY, panelTop + PANEL_H));

  return {
    panelLeft,
    panelTop,
    hexX,
    hexY,
    endX,
    endY,
    slideFrom,
    PANEL_W,
    PANEL_H,
    panelMaxH
  };
}

export const formatCurrency = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};
