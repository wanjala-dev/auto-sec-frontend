# CLAUDE.md — Auto-Sec Frontend (autosec)

Guidance for Claude Code in this repo. **"autosec" = Auto-Sec (Automatic Security).**

## What this is

The React frontend for **Auto-Sec** — an enterprise SOC / blue-team platform. Milestone 1 is
a single full-page surface: the **V2 HUD Command Center**, a sci-fi command-center UI copied **1:1**
from the literacyseed frontend and rendered verbatim.

Stack (mirrors literacyseed): **React 18 · CRA + Craco · Tailwind v3 · JSX/TS**. This is a
deliberate mirror so the V2 HUD copies cleanly; a modernization pass (Vite / React 19 / Tailwind v4)
comes **later, before serious feature work** — not now.

## HARD facts

- **Runs on http://localhost:3001** (port pinned in `.env` — `PORT=3001`). Port **3000 is the
  original literacyseed** frontend; never use it.
- **State management is React Context ONLY — no Redux.** Context is the canonical/target
  architecture here. literacyseed still carries a legacy redux store; autosec deliberately does NOT.
  The V2 page's own dependency closure is redux-free; it's mounted with a minimal Context provider
  tree (`src/root/presentation/V2Providers.jsx`: ErrorToast → Seed → AiChat → Agent).
- **The V2 HUD layout is 1:1 and FROZEN.** `src/features/agents/presentation/pages/CommandCenterV2Page.jsx`
  is the literal literacyseed page (2,749 lines). **Do not change its layout/design** until we
  explicitly start iterating — colours, fonts, and layout stay exactly as they are.

## Provenance — how it was built

The V2 page was brought over by computing its **import closure** from literacyseed and copying every
local dependency (the page + ~187 files: contexts, hooks, components, API clients, domain utils),
preserving `src/`-relative paths. `index.css` (the Tailwind token contract + theme) and
`tailwind.config.js` (neon palette, chamfer, orbit/glow animations) were copied verbatim; only
literacyseed brand-font/decorative-asset `url()`s were removed. `public/index.html` was replaced with
a clean autosec shell (no nonprofit branding, no third-party analytics).

## Running it

```bash
npm install --legacy-peer-deps   # CRA5 tree; ajv pinned via package.json "overrides"
npm start                        # PORT=3001 from .env → http://localhost:3001
```

- **ajv note:** CRA5 needs both schema-utils@3 (react-scripts, ajv6) and schema-utils@4 (terser/css,
  ajv8). `package.json` `overrides` scope ajv per schema-utils version — don't collapse them to one
  ajv, it breaks fork-ts-checker.
- **Type-checking:** `TSC_COMPILE_ON_ERROR=true` + `ESLINT_NO_DEV_ERRORS=true` are set in `.env` so
  the verbatim V2 copy (which carries literacyseed's own loose types) renders without a blocking
  overlay. **New code we write should be strict TypeScript** — the leniency is only to keep the 1:1
  copy rendering, not a license to write loose types.

## Explicit Architecture (frontend)

Mirror literacyseed's explicit-architecture layout — reference:
`/Users/henrywanjala/Desktop/frontend/literacyseed/docs/frontend-explicit-architecture.md` and the
worked example repo `/Users/henrywanjala/Desktop/frontend/examples/explicit-architecture-reactjs`
(Herberto Graça's Explicit Architecture in ReactJS — same author the backend architecture follows).

Layers: `src/domain` (pure concepts), `src/application` (use-cases/services/ports),
`src/infrastructure` (HTTP clients/adapters), `src/features/<feature>/presentation` (pages +
contexts + hooks), `src/shared`, `src/root/presentation` (bootstrap: `index.jsx`, `App.jsx`,
`V2Providers.jsx`). Reusable UI lives in `src/components/` (V2 HUD primitives in `src/components/V2/`).

## Known follow-ups (not yet done)

- **Backend wiring:** the app is not yet proxied to the autosec API (http://localhost:8020). Live
  data calls (e.g. `/api/v1/ai/prompt-eval/reports/`) 404 — the HUD renders with empty/demo data.
  Add a dev proxy / API base pointing at `:8020` when wiring live data.
- Modernization pass (Vite/React19/Tailwind4/strict-TS) + trimming unused closure files.

## Standards

Don't hand-roll UI that the V2 catalog already provides. Keep the V2 layout 1:1 until we iterate.
Context, not redux. New code strict-typed. No shortcuts — root fixes only.
