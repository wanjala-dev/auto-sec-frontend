import React from 'react';
import PropTypes from 'prop-types';

/**
 * HudCheckbox — the HUD design-system checkbox.
 *
 * A chamfered (cut top-right corner) square that matches HudCard's silhouette,
 * drawn as an SVG so the diagonal edge and the checkmark stay crisp at any
 * size (a clip-path on a bordered <div> shears the border off the chamfer).
 *
 * States:
 *   unchecked  — transparent fill, cyan hairline border
 *   checked    — accent fill + glow + dark checkmark
 *   indeterminate — accent-tinted fill + dash (used for "partial")
 *   disabled   — dimmed + not interactive (e.g. role/group-inherited grants)
 *
 * onChange receives the NEXT boolean (not the event), matching the other HUD
 * form controls.
 *
 * Usage:
 *   <HudCheckbox checked={on} onChange={setOn} />
 *   <HudCheckbox checked disabled title="Granted by role" />
 */
export default function HudCheckbox({
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  size = 16,
  accent = '#2EDBE8',
  title,
  className = '',
  'aria-label': ariaLabel
}) {
  const c = Math.max(3, Math.round(size * 0.28)); // chamfer depth
  // Chamfered-square outline: cut the TOP-RIGHT corner.
  const outline = `M1 1 L${size - c} 1 L${size - 1} ${c} L${size - 1} ${
    size - 1
  } L1 ${size - 1} Z`;
  const on = checked || indeterminate;

  const handle = () => {
    if (disabled || !onChange) return;
    onChange(!checked);
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel || title}
      title={title}
      disabled={disabled}
      onClick={handle}
      className={`inline-flex items-center justify-center align-middle transition ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      } ${className}`.trim()}
      style={{ lineHeight: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        style={{
          filter: on && !disabled ? `drop-shadow(0 0 4px ${accent}66)` : 'none'
        }}
      >
        <path
          d={outline}
          fill={on ? accent : 'transparent'}
          fillOpacity={on ? (disabled ? 0.5 : 0.9) : 0}
          stroke={on ? accent : `${accent}66`}
          strokeWidth={1.25}
        />
        {checked && !indeterminate && (
          <path
            d={`M${size * 0.27} ${size * 0.52} L${size * 0.43} ${
              size * 0.68
            } L${size * 0.74} ${size * 0.32}`}
            stroke="#04121f"
            strokeWidth={Math.max(1.5, size * 0.13)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
        {indeterminate && (
          <line
            x1={size * 0.3}
            y1={size * 0.5}
            x2={size * 0.7}
            y2={size * 0.5}
            stroke="#04121f"
            strokeWidth={Math.max(1.5, size * 0.13)}
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}

HudCheckbox.propTypes = {
  checked: PropTypes.bool,
  indeterminate: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  size: PropTypes.number,
  accent: PropTypes.string,
  title: PropTypes.string,
  className: PropTypes.string,
  'aria-label': PropTypes.string
};
