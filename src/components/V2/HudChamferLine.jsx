import React from 'react';
import PropTypes from 'prop-types';

/**
 * HudChamferLine — draws the missing diagonal edge of a chamfered panel.
 *
 * For TRANSLUCENT panels (bg-black/40 + backdrop-blur) the HudCard/HudChip
 * two-layer border trick doesn't work: the outer border-color layer would
 * bleed through the see-through body and tint the whole panel. Instead this
 * drops a small corner box whose "\" gradient band starts ON the cut edge
 * and extends inward — fully inside the clip, so the diagonal renders at
 * full strength while the panel keeps its CSS `border` for the straight
 * edges (same technique as the toast chamfer in HudToast.css).
 *
 * Usage: parent must be `position: relative`, clipped with a top-right
 * chamfer polygon of the same `size`:
 *
 *   <div className="relative border ..." style={{ clipPath: PANEL_CLIP }}>
 *     <HudChamferLine size={10} color="rgba(46,219,232,0.45)" />
 *     ...
 *   </div>
 */
const HudChamferLine = ({ size = 10, color = 'rgba(46,219,232,0.45)' }) => (
  <span
    aria-hidden="true"
    style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: size,
      height: size,
      pointerEvents: 'none',
      zIndex: 2,
      background: `linear-gradient(to bottom left, transparent calc(50% - 0.5px), ${color} calc(50% - 0.5px), ${color} calc(50% + 0.5px), transparent calc(50% + 0.5px))`
    }}
  />
);

HudChamferLine.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string
};

export default HudChamferLine;
