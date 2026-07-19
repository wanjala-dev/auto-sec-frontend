/**
 * Canvas theming helper — lets <canvas>-drawn HUD chrome (orbit rings, nav-frame
 * glow, starfield) follow the dark ⇄ light `--hud-accent` token instead of a
 * hardcoded neon cyan.
 *
 * The token lives on the HUD root (`.hud-light` scope), NOT on documentElement,
 * so we resolve it FROM the canvas element (which is inside that scope) — that
 * yields the daylight teal in light mode and the neon cyan in dark.
 */

const DEFAULT_ACCENT = { r: 46, g: 219, b: 232 }; // #2EDBE8

/** Read the current `--hud-accent` (R G B channels) resolved at `el`'s scope. */
export function readHudAccent(el) {
  try {
    const node = el || document.documentElement;
    const raw = getComputedStyle(node).getPropertyValue('--hud-accent').trim();
    if (raw) {
      const parts = raw.split(/[\s,]+/).map(Number);
      if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
        return { r: parts[0], g: parts[1], b: parts[2] };
      }
    }
  } catch {
    /* ignore — fall through to default */
  }
  return DEFAULT_ACCENT;
}

/** `rgba(...)` string for the current accent at `el`'s scope. */
export function hudAccentRgba(el, alpha = 1) {
  const { r, g, b } = readHudAccent(el);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** `#rrggbb` string for the current accent at `el`'s scope. */
export function hudAccentHex(el) {
  const { r, g, b } = readHudAccent(el);
  const h = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** True when the canvas is inside a `.hud-light` (daylight) scope. */
export function isLightScope(el) {
  try {
    return !!el?.closest?.('.hud-light');
  } catch {
    return false;
  }
}
