import React from 'react';

/**
 * HexEyeLogo — the Auto-Sec brand mark: a hexagon "eye" (watchful SOC sentinel).
 * Theme-aware — drawn in the `--hud-accent` token so it flips neon-cyan (dark)
 * ⇄ daylight-teal (light) with the HUD. Replaces the ported octopus mascot.
 *
 * Props: width/height (default 200), className (sizing).
 */
export default function HexEyeLogo({ width = 200, height = 200, className = '' }) {
  const accent = 'rgb(var(--hud-accent))';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Outer hexagon (pointy-top) */}
      <polygon
        points="50,5 89,27.5 89,72.5 50,95 11,72.5 11,27.5"
        fill="none"
        stroke={accent}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Inner hexagon — faint fill + hairline */}
      <polygon
        points="50,17 78,33.5 78,66.5 50,83 22,66.5 22,33.5"
        fill={accent}
        fillOpacity="0.06"
        stroke={accent}
        strokeOpacity="0.3"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Eye — almond lens */}
      <path
        d="M24 50 Q50 31 76 50 Q50 69 24 50 Z"
        fill="none"
        stroke={accent}
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      {/* Iris */}
      <circle
        cx="50"
        cy="50"
        r="11.5"
        fill="none"
        stroke={accent}
        strokeWidth="3"
      />
      {/* Pupil */}
      <circle cx="50" cy="50" r="4.8" fill={accent} />
      {/* Catch-light glint */}
      <circle cx="54" cy="46" r="1.5" fill="#ffffff" fillOpacity="0.85" />
    </svg>
  );
}
