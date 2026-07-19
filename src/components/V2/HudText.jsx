import React from 'react';

/**
 * HudText — V2 typography component.
 *
 * Consistent monospace text styles for the V2 Command Center.
 * Replaces scattered inline text-[Xpx] font-mono classes with
 * semantic variants.
 *
 * Usage:
 *   <HudText variant="title">COMMAND CENTER</HudText>
 *   <HudText variant="label">STATUS</HudText>
 *   <HudText variant="stat" color="cyan">98%</HudText>
 *   <HudText variant="body">Description text here</HudText>
 */

const VARIANTS = {
  // Page/section title — bold, 12px, wide tracking
  title: 'text-[12px] font-bold tracking-[0.12em]',
  // Panel/card heading — semibold, 9px, uppercase, widest tracking
  heading: 'text-[9px] font-semibold uppercase tracking-[0.2em]',
  // Form label or category — semibold, 9px, wide tracking
  label: 'text-[9px] font-semibold tracking-[0.15em]',
  // Stat/metric value — bold, 11px, tabular numbers
  stat: 'text-[11px] font-bold tabular-nums',
  // Stat label (beside value) — 7px, normal weight
  statLabel: 'text-[7px]',
  // Body text — 12px, normal weight, relaxed leading
  body: 'text-[12px] leading-relaxed',
  // Small body — 10px
  bodySmall: 'text-[10px]',
  // Caption/hint — 8px, muted
  caption: 'text-[8px]',
  // Tiny — 7px, for minimal labels
  tiny: 'text-[7px]',
  // Button text — bold, 11px, wide tracking
  button: 'text-[11px] font-bold tracking-[0.12em]',
  // Chat message — 12px, pre-line wrapping
  message: 'text-[12px] whitespace-pre-line',
  // Large display — 15px, for voice transcript overlay
  display: 'text-[15px] leading-relaxed',
  // Code/monospace value — 10px
  code: 'text-[10px]'
};

const COLORS = {
  cyan: 'text-cyan-500',
  'cyan-muted': 'text-cyan-500/40',
  'cyan-dim': 'text-cyan-500/30',
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
  purple: 'text-purple-400',
  red: 'text-red-400',
  pink: 'text-pink-400',
  white: 'text-hud-text',
  light: 'text-hud-text',
  muted: 'text-hud-dim',
  dim: 'text-hud-dim',
  faint: 'text-hud-dim',
  ghost: 'text-gray-800'
};

export default function HudText({
  variant = 'body',
  color = 'light',
  as: Tag = 'span',
  className = '',
  style,
  children,
  ...rest
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.body;
  const colorClass = COLORS[color] || color;

  return (
    <Tag
      className={`font-mono ${variantClass} ${colorClass} ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Export constants for direct use when the component is overkill
HudText.VARIANTS = VARIANTS;
HudText.COLORS = COLORS;
