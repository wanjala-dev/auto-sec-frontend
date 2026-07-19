---
name: autosec-v2-hud
description: Use BEFORE writing ANY UI in the autosec (Auto-Sec) frontend (/Users/henrywanjala/Desktop/auto-sec/auto-sec-frontend). Loads the V2 HUD design-system catalog — HudPanel, HudButton, HudText, HexLoader, StarField, RestrictedArea, DraggablePanel, SlideInHexPanel, the CoreCanvas hex ring, HudKanbanBoard, and the design tokens (cyan #2EDBE8 neon palette, mono type scale) — with import paths, props, and "do this NOT that" examples. Triggers on any task involving a panel, card, button, label/text, spinner, board, modal, drawer, hex node, or "build a HUD surface / V2 screen for X". The whole product is ONE full-screen sci-fi command-center HUD; hand-rolling a `<div className="border …">` panel or a raw `<button>` is a forbidden fork. Also enforces: React Context + useReducer ONLY, never redux.
---

# Octosec V2 HUD — Design System Reuse

**Read this BEFORE writing any UI in the autosec frontend.** autosec (Auto-Sec — "Automatic Security") is a **single full-screen command-center HUD**, forked verbatim from literacyseed's "V2" design language. Every surface is built from the primitives in `src/components/V2/`. Hand-rolling a bespoke panel, button, spinner, or text style is a HARD-RULE fork — reuse the V2 component, and if one is missing, add it to `src/components/V2/` so the next surface reuses it too.

This is autosec's equivalent of literacyseed's `frontend-reuse` skill — same discipline, different (sci-fi HUD) catalog. **There is no V1 light theme here.** Everything is V2.

---

## HARD RULE — build from V2 primitives; never hand-roll HUD chrome

For every visual element a surface needs — a panel/card, a button, a text label or stat, a spinner, a status pill, a board, a hex node, a drawer — you MUST use the V2 component that already exists in `src/components/V2/`. A `<div className="border border-cyan-500/… bg-… p-…">` "panel", a raw `<button>`, a hand-rolled `text-[9px] font-mono` label, or a custom canvas spinner **inside a feature folder** is a fork, even a "small" one. If the primitive doesn't fit, extend it (add a prop) or add a new component under `src/components/V2/` — never inline a one-off.

The tell is the same every time: neon-bordered `<div>`s, raw `text-[Xpx] font-mono text-cyan-…` strings, or a `<button className="…chamfer…">` sitting in `src/features/**` instead of imported from `src/components/V2/**`.

---

## Design tokens (the source of truth for every value)

**Palette** (`tailwind.config.js` + `v2Constants.js`):
- Primary neon: **cyan `#2EDBE8`** (`text-cyan-500`, `border-cyan-500/…`). Backgrounds: **`#050814` (deep)**, `#071021` (night), `#020309` (deepest), panels at `#060c18`/`#081120`.
- Accent cycle (lanes, series, severity): `#2EDBE8` cyan · `#F59E0B` amber · `#8B5CF6` violet · `#E84D8A` pink · `#34d399` emerald. Danger/critical `#ff3b52`.
- Borders are almost always low-alpha cyan: `border-cyan-500/[0.08]` … `/30`. Never a solid bright border.

**Type — ALWAYS via `HudText`, never raw `text-[Xpx] font-mono`.** Variants: `title` `heading` `label` `stat` `statLabel` `body` `bodySmall` `caption` `tiny` `button` `message` `display` `code`. Colors: `cyan` `cyan-muted` `cyan-dim` `amber` `emerald` `purple` `red` `pink` `white` `light` `muted` `dim` `faint` `ghost`.

---

## The catalog — import from here, do not re-derive

| Need | Use THIS | Import | Key props |
|---|---|---|---|
| Text / label / stat | **HudText** | `components/V2/HudText` | `variant`, `color`, `as`, `className` |
| Panel / card frame (animated neon border) | **HudPanel** | `components/V2/HudPanel` | `title`, `className`, `children` |
| Chamfered card w/ VISIBLE chamfer border | **HudCard** | `components/V2/HudCard` | `size` (sm/lg), `border`, `surface`, `bodyClassName`, `className` — the standard chamfered card; two-layer clip so the diagonal edge keeps its border. Use instead of hand-rolling `style={{clipPath}}` + `border` (which loses the diagonal line) |
| Button (chamfered, sci-fi) | **HudButton** | `components/V2/HudButton` | `variant` (primary/secondary/ghost), `theme`, `icon`, `showArrow`, `onClick`, `disabled`, `fullWidth` |
| Multi-step progress indicator | **HudStepper** | `components/V2/HudStepper` | `steps` ([{label}]), `current` (0-based) — "STEP X / N" + node track for wizards/onboarding |
| Segmented tab strip (mode/view switch) | **HudTabs** | `components/V2/HudTabs` | `tabs` ([{id,label,disabled}]), `activeId`, `onChange`, `size` (sm/md), `fill` — use for any mutually-exclusive mode switch (auth login/register/reset, panel sub-tabs, filter segments); never hand-roll a `<button>` strip |
| Loading spinner | **HexLoader** | `components/V2/HexLoader` | `size`, `color`, `label`, `speed` — hexagonal octopus loader; use everywhere instead of a custom spinner |
| Starfield backdrop | **StarField** | `components/V2/StarField` | `count` |
| Full-screen auth frame (starfield + eye + card) | **AuthShell** | `components/V2/AuthShell` | `title`, `subtitle`, `status` (idle/busy/error), `footer`, `children` — the shared frame for login/onboarding/reset/verify pages; the "eye" glitches cyan while busy, red on error |
| Auth-gate / empty / under-construction | **RestrictedArea** | `components/V2/RestrictedArea` | `title`, `subtitle`, `message`, `variant` (error/info), `action` |
| Draggable floating panel | **DraggablePanel** | `components/V2/DraggablePanel` | `id`, `offset`, `children` |
| Hex-anchored slide-in panel | **SlideInHexPanel** | `components/V2/SlideInHexPanel` | placement-driven; dynamic height (`minHeight`, `maxHeight`) |
| Callout line (hex → panel) | **CalloutLine** | `components/V2/CalloutLine` | `hexX/hexY/endX/endY`, `color` |
| The center hex ring / core | **CoreCanvas** | in `CommandCenterV2Page` | `agents`, `healthPct`, `onHexClick`, `containerRef`, `detectionsPulseRef` — canvas ring of hex nodes with glitch-glow halos |
| SOC triage board (Kanban) | **HudKanbanBoard** | `components/V2/kanban/HudKanbanBoard` | `seedId` — see case study below |
| Nav drawer / side nav | **HudNavDrawer**, **HudSideNav** | `components/V2/…` | context menu + module rail |
| Search bar | **HudSearch** | `components/V2/HudSearch` | `seedId` |
| Chat panel / voice / deep-run progress / payment card / prompt-quality | **HudChatPanel**, **HudVoiceModal**, **HudDeepRunProgress**, **HudPaymentCard**, **HudPromptQualityPanel** | `components/V2/…` | domain panels — reuse, don't re-skin |
| Mobile block | **MobileGate** | `components/V2/MobileGate` | wraps the HUD (desktop-only) |

---

## Do this, NOT that

```jsx
// ❌ FORK — hand-rolled panel + text + button
<div className="border border-cyan-500/10 bg-[#060c18]/80 p-3">
  <span className="text-[9px] font-mono text-cyan-500/40">STATUS</span>
  <button className="text-[11px] font-mono …">RUN</button>
</div>

// ✅ REUSE — V2 primitives
<HudPanel title="STATUS">
  <HudText variant="body" color="light">…</HudText>
  <HudButton variant="primary" onClick={run}>RUN</HudButton>
</HudPanel>
```

```jsx
// ❌ custom spinner            // ✅ the hex loader
<div className="animate-spin…"/>  <HexLoader size={64} label="LOADING…" />
```

```jsx
// ❌ raw label                        // ✅ typed HUD text
<p className="text-[8px] text-gray-500">3 FINDINGS</p>
<HudText variant="caption" color="muted">3 FINDINGS</HudText>
```

---

## Case study — the SOC triage board (how to add a data surface the right way)

`components/V2/kanban/HudKanbanBoard.jsx` is the reference for adding a new **data-backed** HUD surface without reinventing anything:

- **UI** is built entirely from V2 primitives (HudText, HexLoader, HUD-styled lanes/cards) — no ported light-theme board.
- **State** comes from the already-present shared **`KanbanBoardContext`** (columns, tasks, `onDragStart/End/Over`, `fetchColumns`, `assignUserToTask`) — mounted in `V2Providers`. We did NOT build a new store.
- **Drag** reuses the existing kanban drag hooks by satisfying their `@dnd-kit` contract: cards register `useSortable({ id: 'task-<pk>', data: { type: 'Task', task, column } })`, lanes are `type: 'Column'` droppables (`taskSortableId.js`).
- **Cross-component signal** (new task → glitch-glow the DETECTIONS hex) is passed by **ref prop** into `CoreCanvas` (`detectionsPulseRef`) and read live in the canvas draw loop — never lifted into redux.

When you add a surface, follow this shape: **V2 primitives for chrome + existing Context for state + ref/prop for canvas signals.** If the state layer is missing, add a Context under `src/features/<x>/presentation/` with a `useReducer` (see the pattern in `SeedContext`/`KanbanBoardContext`), and mount it in `V2Providers.jsx`.

---

## State management — Context + useReducer ONLY (HARD RULE)

autosec keeps **all** state in React Context backed by `useReducer`, organized exactly like literacyseed: one `…Context.tsx` per feature under `src/features/<x>/presentation/`, its reducer in `src/reducer/`, composed via `use…ProviderComposition`/`use…ProviderValue` hooks, mounted in `src/root/presentation/V2Providers.jsx`.

- **NEVER add redux.** `@reduxjs/toolkit` and `react-redux` were removed from `package.json` and the dead `src/store/` (a stray CRA `configureStore` + counter slice) was deleted — on purpose. Do not reintroduce them, do not `configureStore`, `createSlice`, `useSelector`, or `<Provider store>`.
- Need shared state? Add a Context provider (mirror `SeedContext`/`KanbanBoardContext`) and mount it in `V2Providers`. That's the only pattern.

---

## Where things live

```
src/components/V2/          ← the design system (this catalog)
src/components/V2/kanban/   ← HudKanbanBoard + taskSortableId helper
src/features/<x>/presentation/…Context.tsx  ← per-feature state (Context + useReducer)
src/reducer/                ← the reducers those contexts use
src/root/presentation/V2Providers.jsx       ← the provider tree (mount new contexts here)
src/features/agents/presentation/pages/CommandCenterV2Page.jsx  ← the single HUD page (CoreCanvas hex ring, panels, drawer)
```

When a V2 primitive is missing for something you need, **add it to `src/components/V2/`** (with the neon-cyan tokens above) so it becomes part of this catalog — don't inline a one-off in a feature page.

## Reuse shared utilities — don't hand-roll (HARD RULE)

Before writing a validator, formatter, or any helper in a component, check `src/shared/**` (and grep literacyseed's `src/shared/**` to port) — there's already `shared/validation/` (`isValidEmail`, `isValidUUID`), `shared/money/`, `shared/ui/`, `shared/date/`. A component-local regex/format helper that duplicates one of these is a fork. Reuse the shared util; if it's missing, ADD it under `src/shared/**` (ported from literacyseed when possible) so the next caller reuses it too. Worked example: the login email check reuses `shared/validation/emailValidation.isValidEmail`, not an inline regex.
