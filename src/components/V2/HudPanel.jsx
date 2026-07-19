import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { CHAMFER, HUD_CLIP } from './v2Constants';

/**
 * V2 HUD panel with chamfered top-right corner and Canvas-drawn border.
 */
const HudBorderCanvas = ({ canvasRef }) => {
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.beginPath();
      ctx.moveTo(0.5, 0.5);
      ctx.lineTo(w - CHAMFER - 0.5, 0.5);
      ctx.lineTo(w - 0.5, CHAMFER + 0.5);
      ctx.lineTo(w - 0.5, h - 0.5);
      ctx.lineTo(0.5, h - 0.5);
      ctx.closePath();

      ctx.strokeStyle = 'rgba(46,219,232,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [canvasRef]);

  return null;
};

const HudPanel = ({ children, className = '', title }) => {
  const borderRef = useRef(null);
  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={borderRef}
        className="absolute inset-0 pointer-events-none z-[2]"
      />
      <HudBorderCanvas canvasRef={borderRef} />
      <div
        className="bg-hud-surface/40 backdrop-blur-sm px-3 py-2 h-full overflow-hidden"
        style={{ clipPath: HUD_CLIP }}
      >
        {title && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/15 to-transparent" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-hud-dim font-mono">
              {title}
            </p>
            <div className="h-px flex-1 bg-gradient-to-l from-cyan-500/15 to-transparent" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

HudPanel.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  title: PropTypes.string
};

export default HudPanel;
