# Single-Screen HUD — never navigate away (HARD RULE)

auto-sec is **one screen**: the full-screen V2 command-center HUD. The operator
never navigates away from it. Every surface you build — settings, profile,
security, sessions, audit, a detail view, a wizard, a form — is a **floating
card, panel, or modal overlay ON the HUD**, not a separate route/page you
navigate to.

## The rule

- **Do NOT create new routes/pages** for authenticated surfaces. A URL like
  `/settings`, `/settings?section=profile`, `/profile`, `/sessions`, `/audit`
  that renders its own full page **breaks the single-screen principle** and is a
  forbidden fork.
- **New surfaces are overlays.** Render them as:
  - an **`activePanel` drawer** in `CommandCenterV2Page` (the existing panel
    mechanism — `setActivePanel('<id>')` opens it, the drawer renders the
    content, `setActivePanel(null)` closes it), or
  - a **floating card / modal popup** layered over the HUD.
- **Open surfaces by setting panel/modal state, never by `navigate()`.** A nav
  item, hex node, or button opens a surface with `setActivePanel('settings')` —
  not `navigate('/settings')`. There is no "OPEN FULL →" that leaves the HUD.
- **Reuse the section components** (e.g. `ProfileSection`, `SecuritySection`,
  `SessionsSection`) as panel/modal *content*. The container is the HUD overlay,
  not a page.

## The only exception — pre-authentication gates

The **login, register, password-reset-confirm, reset-success, and
email-confirmed** screens are full-screen and route-based *because there is no
HUD to overlay yet* — the operator isn't authenticated. These are the ONLY
non-HUD screens. The **onboarding** gate is post-authentication, so it is a
blocking **modal over the HUD**, not a route.

## Why

A command center is a single situational-awareness surface. Navigating to a
separate page destroys that context (the ring, the panels, the live state all
vanish) and reads like a generic web app, not a HUD. Overlays keep the operator
oriented — the HUD stays behind, the surface floats in front.

## Cross-references

- `.claude/skills/autosec-v2-hud/SKILL.md` — the V2 component catalog (HudCard,
  HudTabs, HudPanel, AuthShell) you compose overlays from.
- `CommandCenterV2Page.jsx` — the single HUD page + the `activePanel` drawer.
