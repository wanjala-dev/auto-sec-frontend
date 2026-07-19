import React from 'react';

/**
 * HudCard — the standard V2 HUD panel with a VISIBLE chamfered border.
 *
 * A plain `clip-path` chamfer clips the element's own border off the diagonal
 * edge, so the cut corner reads as borderless. HudCard fixes that with a
 * two-layer clip: an outer layer painted in the border color, and an inner
 * content layer inset by 1px (via `p-px`) clipped to the same shape — the 1px
 * gap shows through as a border that follows the chamfer, diagonal included.
 *
 * Use this for EVERY chamfered card/panel (auth card, settings cards, modal
 * bodies, the wordmark chip) instead of hand-rolling `style={{clipPath}}` +
 * `border` (which loses the diagonal line).
 *
 * Usage:
 *   <HudCard className="w-full max-w-md">…</HudCard>
 *   <HudCard size="sm" border="cyan-strong" bodyClassName="p-4">…</HudCard>
 *
 * Props:
 *   size        — 'sm' | 'lg' (chamfer depth; default 'sm' = 6px)
 *   border      — 'cyan' (default) | 'cyan-strong' | 'amber' | 'emerald' | custom bg-* class
 *   surface     — inner background class (default translucent HUD navy w/ blur)
 *   bodyClassName — padding/layout on the inner content layer (default 'p-8')
 *   className   — classes on the outer wrapper (sizing, margins)
 */
const BORDERS = {
  cyan: 'bg-hud-accent/35',
  'cyan-strong': 'bg-hud-accent/60',
  amber: 'bg-amber-500/45',
  emerald: 'bg-emerald-500/45'
};

// Chamfer depth (px) of the top-right diagonal cut, per size. Bigger = more
// pronounced angle. Override per-instance with the `chamfer` prop.
const CHAMFERS = { sm: 16, md: 22, lg: 32 };

const clipFor = (px) =>
  `polygon(0 0, calc(100% - ${px}px) 0, 100% ${px}px, 100% 100%, 0 100%)`;

export default function HudCard({
  children,
  size = 'sm',
  chamfer,
  border = 'cyan',
  surface = 'bg-hud-surface/85 backdrop-blur-xl',
  bodyClassName = 'p-8',
  className = '',
  style
}) {
  const px =
    typeof chamfer === 'number' ? chamfer : CHAMFERS[size] || CHAMFERS.sm;
  const clip = clipFor(px);
  const borderClass = BORDERS[border] || border;
  return (
    <div
      className={`relative ${borderClass} ${className}`}
      style={{ clipPath: clip, padding: '1.5px', ...style }}
    >
      <div className={`${surface} ${bodyClassName}`} style={{ clipPath: clip }}>
        {children}
      </div>
    </div>
  );
}
