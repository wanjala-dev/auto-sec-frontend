import React from 'react';
import PropTypes from 'prop-types';

/**
 * HudChip — small chamfered tag/pill button (top-right + bottom-left cut)
 * with a border that stays VISIBLE along both diagonals.
 *
 * A plain `clip-path` + CSS `border` on one element clips the border off the
 * cut corners, so the chamfer reads as a gap (the recurring HUD bug — toasts,
 * nav tabs, thread pills all hit it). Like HudCard, this uses the two-layer
 * clip: the outer layer paints the border color, the inner layer paints the
 * surface inset by 1px, and the 1px ring that shows through follows the full
 * polygon, diagonals included.
 *
 * Use for EVERY small chamfered tab/pill/chip (chat threads, suggestion
 * pills, filter tags) instead of hand-rolling `clipPath` + `border`.
 */
export const CHIP_CLIP =
  'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))';

const HudChip = ({
  active = false,
  onClick,
  className = '',
  activeBorder = 'rgba(46,219,232,0.45)',
  inactiveBorder = 'rgba(255,255,255,0.08)',
  activeSurface = 'rgba(46,219,232,0.10)',
  inactiveSurface = 'rgba(10,15,26,0.6)',
  children,
  ...rest
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex-shrink-0 p-0 transition"
    style={{
      clipPath: CHIP_CLIP,
      padding: 1,
      background: active ? activeBorder : inactiveBorder
    }}
    {...rest}
  >
    <span
      className={`flex items-center px-3 py-1 text-[9px] font-mono tracking-wider transition ${className}`}
      style={{
        clipPath: CHIP_CLIP,
        background: active ? activeSurface : inactiveSurface
      }}
    >
      {children}
    </span>
  </button>
);

HudChip.propTypes = {
  active: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
  activeBorder: PropTypes.string,
  inactiveBorder: PropTypes.string,
  activeSurface: PropTypes.string,
  inactiveSurface: PropTypes.string,
  children: PropTypes.node
};

export default HudChip;
