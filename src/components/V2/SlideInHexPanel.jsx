import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { HUD_CLIP, computeHexPanelPlacement } from './v2Constants';
import CalloutLine from './CalloutLine';

/**
 * Slide-in panel that appears near a clicked hex node on the ring,
 * connected by an animated callout line.
 */
const SlideInHexPanel = ({
  activeHexPanel,
  containerRef,
  onClose,
  title,
  children
}) => {
  // Track the container's live size. The callout + panel are placed relative to
  // it, so when a side drawer slides open/closed and resizes the center, we must
  // recompute — otherwise the callout points at a stale (now-empty) position.
  const [dims, setDims] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return undefined;
    const update = () =>
      setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const placement = useMemo(() => {
    if (!activeHexPanel || !dims.w || !dims.h) return null;
    return computeHexPanelPlacement(activeHexPanel.angle, dims.w, dims.h);
  }, [activeHexPanel, dims.w, dims.h]);

  return (
    <AnimatePresence>
      {activeHexPanel && placement && (
        <React.Fragment key={activeHexPanel.nodeId}>
          {/* Callout line — keyed so SVG animations replay per hex.
              Color matches the selected hex node so the line reads as its lead. */}
          <CalloutLine
            hexX={placement.hexX}
            hexY={placement.hexY}
            endX={placement.endX}
            endY={placement.endY}
            color={activeHexPanel.color || '#2EDBE8'}
          />

          {/* Slide-in panel */}
          <motion.div
            initial={{
              opacity: 0,
              x: placement.slideFrom.x,
              y: placement.slideFrom.y
            }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{
              opacity: 0,
              x: placement.slideFrom.x,
              y: placement.slideFrom.y
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute z-[30] border border-hud-line/[0.1] bg-hud-surface/95 backdrop-blur-xl overflow-hidden flex flex-col"
            style={{
              left: placement.panelLeft,
              top: placement.panelTop,
              width: placement.PANEL_W,
              // Dynamic height: start at PANEL_H, grow with content, cap + scroll.
              minHeight: placement.PANEL_H,
              maxHeight: 'min(70vh, 520px)',
              clipPath: HUD_CLIP
            }}
          >
            {/* Title bar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-cyan-500/[0.06] flex-shrink-0">
              <span className="text-[8px] font-mono font-semibold text-cyan-500/50 tracking-[0.15em]">
                {title || activeHexPanel.nodeId?.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-600 hover:text-cyan-400 transition"
              >
                <FiX size={10} />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto p-2 cc-scrollbar">
              {children}
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};

SlideInHexPanel.propTypes = {
  activeHexPanel: PropTypes.shape({
    nodeId: PropTypes.string,
    hexIndex: PropTypes.number,
    hexCount: PropTypes.number,
    angle: PropTypes.number,
    panelId: PropTypes.string,
    context: PropTypes.string,
    color: PropTypes.string
  }),
  containerRef: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node
};

export default SlideInHexPanel;
