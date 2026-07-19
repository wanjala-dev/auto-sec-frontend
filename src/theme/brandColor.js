/**
 * Runtime brand-color resolver.
 *
 * For surfaces a Tailwind class can't reach — canvas charts (Chart.js), D3 /
 * SVG presentation attributes, and JS color arrays fed to charting libs — read
 * the active workspace theme's CSS variable (defined in src/index.css) at CALL
 * TIME so the colour reflects the current brand once per-workspace theming is
 * applied. A concrete hex fallback keeps rendering correct before styles load
 * and in non-DOM contexts (tests / SSR).
 *
 * This is the ONE sanctioned home for raw brand hex (as fallbacks) — it is
 * exempted from the no-raw-brand-hex lint rule. Everywhere else imports from
 * here instead of hardcoding the hex, so charts stay themeable and the palette
 * has a single source of truth.
 *
 * Design: docs/plans/WORKSPACE_THEMING_DESIGN_2026-07-09.md
 */

const resolve = (name, fallback) => {
  if (typeof document === 'undefined' || !document.documentElement)
    return fallback;
  const channels = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  // CSS stores space-separated channels ("66 185 143"); charting libs (esp.
  // canvas) are happiest with comma syntax.
  return channels ? `rgb(${channels.split(/\s+/).join(', ')})` : fallback;
};

export const brandColor = {
  primary: () => resolve('--primary', '#42B98F'),
  secondary: () => resolve('--secondary', '#F5AB5B'),
  tertiary: () => resolve('--tertiary', '#F78407')
};

export default brandColor;
