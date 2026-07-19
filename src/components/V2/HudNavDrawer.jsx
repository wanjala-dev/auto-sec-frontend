import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { hudAccentRgba } from './hudCanvasTheme';

/**
 * V2 HUD nav bar with canvas-drawn trapezoid frame and slide drawer.
 *
 * position="top"    → notch dips DOWN, drawer slides DOWN
 * position="bottom" → notch rises UP, drawer slides UP
 *
 * Wings fade to transparent at each edge.
 */

const BAR_H = 48;
const INSET = 8;
const NOTCH_D = 26;
const NOTCH_R = 0.38;
const WING = 44;
const FADE = 80;

const drawFrame = (canvas, position) => {
  const parent = canvas.parentElement;
  if (!parent) return;
  const w = parent.clientWidth;
  const h = BAR_H;
  if (w < 10) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Theme-aware accent (neon cyan in dark, daylight teal in light).
  const GLOW = hudAccentRgba(canvas, 0.6);
  const LINE = hudAccentRgba(canvas, 0.25);

  const nw = w * NOTCH_R;
  const nl = (w - nw) / 2;
  const nr = nl + nw;

  const y1 = position === 'bottom' ? h - INSET - 12 : INSET;
  const y2 = position === 'bottom' ? y1 - NOTCH_D : y1 + NOTCH_D;

  // Points along the path
  const pts = [
    [0, y1],
    [nl - WING, y1],
    [nl, y2],
    [nr, y2],
    [nr + WING, y1],
    [w, y1]
  ];

  // Draw left wing (faded)
  const drawSegment = (from, to, alpha) => {
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.globalAlpha = alpha;
    ctx.stroke();
  };

  // Main line — split into segments for fading edges
  ctx.lineCap = 'butt';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = LINE;

  // Left fade: pts[0] → pts[1] (fade in over FADE px)
  const leftLen = pts[1][0] - pts[0][0];
  if (leftLen > 0) {
    const fadeSteps = 12;
    const fadeEnd = Math.min(FADE, leftLen);
    for (let i = 0; i < fadeSteps; i++) {
      const t0 = i / fadeSteps;
      const t1 = (i + 1) / fadeSteps;
      const x0 = pts[0][0] + t0 * leftLen;
      const x1 = pts[0][0] + t1 * leftLen;
      const a = Math.min(1, x0 / fadeEnd);
      drawSegment([x0, y1], [x1, y1], a);
    }
    // Rest of left wing (full opacity)
    if (leftLen > FADE) {
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(pts[0][0] + FADE, y1);
      ctx.lineTo(pts[1][0], y1);
      ctx.stroke();
    }
  }

  // Center (full opacity): pts[1] → pts[2] → pts[3] → pts[4]
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(pts[1][0], pts[1][1]);
  ctx.lineTo(pts[2][0], pts[2][1]);
  ctx.lineTo(pts[3][0], pts[3][1]);
  ctx.lineTo(pts[4][0], pts[4][1]);
  ctx.stroke();

  // Right fade: pts[4] → pts[5]
  const rightLen = pts[5][0] - pts[4][0];
  if (rightLen > 0) {
    const fadeSteps = 12;
    const fadeStart = pts[5][0] - Math.min(FADE, rightLen);
    for (let i = 0; i < fadeSteps; i++) {
      const t0 = i / fadeSteps;
      const t1 = (i + 1) / fadeSteps;
      const x0 = pts[4][0] + t0 * rightLen;
      const x1 = pts[4][0] + t1 * rightLen;
      const a = x0 > fadeStart ? Math.max(0, 1 - (x0 - fadeStart) / FADE) : 1;
      drawSegment([x0, y1], [x1, y1], a);
    }
  }

  // Glow pass on the center (notch area only)
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.shadowColor = GLOW;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = GLOW;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(pts[1][0], pts[1][1]);
  ctx.lineTo(pts[2][0], pts[2][1]);
  ctx.lineTo(pts[3][0], pts[3][1]);
  ctx.lineTo(pts[4][0], pts[4][1]);
  ctx.stroke();
  ctx.restore();

  // Subtle notch fill
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(pts[1][0], pts[1][1]);
  ctx.lineTo(pts[2][0], pts[2][1]);
  ctx.lineTo(pts[3][0], pts[3][1]);
  ctx.lineTo(pts[4][0], pts[4][1]);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, y1, 0, y2);
  grad.addColorStop(0, hudAccentRgba(canvas, 0.01));
  grad.addColorStop(1, hudAccentRgba(canvas, 0.06));
  ctx.fillStyle = grad;
  ctx.fill();

  // Corner dots
  [pts[1], pts[2], pts[3], pts[4]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = GLOW;
    ctx.globalAlpha = 1;
    ctx.fill();
  });

  // For bottom position: draw a mirrored top line (same shape, flipped)
  if (position === 'bottom') {
    const topY = INSET;
    const topNotchY = topY + NOTCH_D;
    const topPts = [
      [0, topY],
      [nl - WING, topY],
      [nl, topNotchY],
      [nr, topNotchY],
      [nr + WING, topY],
      [w, topY]
    ];
    // Left fade
    const tLeftLen = topPts[1][0] - topPts[0][0];
    if (tLeftLen > 0) {
      const fadeSteps = 12;
      const fadeEnd = Math.min(FADE, tLeftLen);
      for (let i = 0; i < fadeSteps; i++) {
        const t0 = i / fadeSteps;
        const t1 = (i + 1) / fadeSteps;
        const x0 = topPts[0][0] + t0 * tLeftLen;
        const x1 = topPts[0][0] + t1 * tLeftLen;
        const a = Math.min(1, x0 / fadeEnd);
        drawSegment([x0, topY], [x1, topY], a);
      }
      if (tLeftLen > FADE) {
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(topPts[0][0] + FADE, topY);
        ctx.lineTo(topPts[1][0], topY);
        ctx.stroke();
      }
    }
    // Center notch
    ctx.globalAlpha = 1;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(topPts[1][0], topPts[1][1]);
    ctx.lineTo(topPts[2][0], topPts[2][1]);
    ctx.lineTo(topPts[3][0], topPts[3][1]);
    ctx.lineTo(topPts[4][0], topPts[4][1]);
    ctx.stroke();
    // Right fade
    const tRightLen = topPts[5][0] - topPts[4][0];
    if (tRightLen > 0) {
      const fadeSteps = 12;
      const fadeStart = topPts[5][0] - Math.min(FADE, tRightLen);
      for (let i = 0; i < fadeSteps; i++) {
        const t0 = i / fadeSteps;
        const t1 = (i + 1) / fadeSteps;
        const x0 = topPts[4][0] + t0 * tRightLen;
        const x1 = topPts[4][0] + t1 * tRightLen;
        const a = x0 > fadeStart ? Math.max(0, 1 - (x0 - fadeStart) / FADE) : 1;
        drawSegment([x0, topY], [x1, topY], a);
      }
    }
    // Glow on top notch
    ctx.save();
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = GLOW;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(topPts[1][0], topPts[1][1]);
    ctx.lineTo(topPts[2][0], topPts[2][1]);
    ctx.lineTo(topPts[3][0], topPts[3][1]);
    ctx.lineTo(topPts[4][0], topPts[4][1]);
    ctx.stroke();
    ctx.restore();
    // Corner dots on top line
    [topPts[1], topPts[2], topPts[3], topPts[4]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = GLOW;
      ctx.globalAlpha = 1;
      ctx.fill();
    });
  }
};

const HudNavDrawer = ({
  items = [],
  position = 'top',
  defaultActiveId = null,
  className = '',
  mode = 'toggle',
  onTabChange
}) => {
  const canvasRef = useRef(null);
  const [activeId, setActiveId] = useState(defaultActiveId);
  const [renderedId, setRenderedId] = useState(defaultActiveId);
  const [drawerHeight, setDrawerHeight] = useState(0);
  const drawerRef = useRef(null);

  // When opening: set renderedId immediately, measure after render
  // When closing: keep renderedId so content stays during animation, clear after transition
  useEffect(() => {
    if (activeId) {
      setRenderedId(activeId);
      // Double rAF: first frame renders the content, second measures it
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (drawerRef.current) {
            setDrawerHeight(drawerRef.current.scrollHeight);
          }
        });
      });
    } else {
      setDrawerHeight(0);
      const t = setTimeout(() => setRenderedId(null), 400);
      return () => clearTimeout(t);
    }
  }, [activeId]);

  // Re-measure when renderedId changes (content swapped)
  useEffect(() => {
    if (renderedId && drawerRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (drawerRef.current) {
            setDrawerHeight(drawerRef.current.scrollHeight);
          }
        });
      });
    }
  }, [renderedId]);

  // Track content growth while open — panels that load data async (e.g. the
  // LOGS stream) render small first and grow when records arrive; without
  // this the drawer stays clamped at the initial measured height.
  useEffect(() => {
    if (!renderedId || !drawerRef.current) return undefined;
    const ro = new ResizeObserver(() => {
      if (drawerRef.current) {
        setDrawerHeight(drawerRef.current.scrollHeight);
      }
    });
    ro.observe(drawerRef.current);
    return () => ro.disconnect();
  }, [renderedId]);

  const handleClick = useCallback(
    (id) => {
      if (mode === 'select') {
        setActiveId(id);
        onTabChange?.(id);
      } else {
        setActiveId((prev) => {
          const next = prev === id ? null : id;
          onTabChange?.(next);
          return next;
        });
      }
    },
    [mode, onTabChange]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => drawFrame(canvas, position);
    draw();
    // Redraw after a short delay too (in case parent width wasn't ready)
    const t = setTimeout(draw, 100);
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [position]);

  // Use renderedId to keep content visible during close animation
  const renderedItem = renderedId
    ? items.find((i) => i.id === renderedId)
    : null;
  const isOpen = !!activeId;

  const isBottom = position === 'bottom';

  const btnStyle = isBottom
    ? { bottom: INSET + 16, height: NOTCH_D - 4 }
    : { top: INSET + 6, height: NOTCH_D - 4 };

  const drawerContent = (
    <div
      className="overflow-hidden"
      style={{
        maxHeight: isOpen ? drawerHeight : 0,
        opacity: isOpen ? 1 : 0,
        transition:
          'max-height 350ms cubic-bezier(0.4,0,0.2,1), opacity 250ms ease'
      }}
    >
      <div ref={drawerRef}>
        <div
          style={{
            height: 1,
            background:
              'linear-gradient(90deg, transparent 15%, rgba(46,219,232,0.12) 35%, rgba(46,219,232,0.12) 65%, transparent 85%)'
          }}
        />
        <div
          className="bg-hud-surface/50 backdrop-blur-md border-x border-hud-line/[0.08]"
          style={{
            overflow: 'auto',
            ...(isBottom
              ? { borderTop: '1px solid rgba(46,219,232,0.08)' }
              : { borderBottom: '1px solid rgba(46,219,232,0.08)' })
          }}
        >
          {renderedItem?.content}
          {/* Close bar */}
          <button
            type="button"
            onClick={() => setActiveId(null)}
            className="w-full flex items-center justify-center py-1 transition"
            style={{ borderTop: '1px solid rgba(46,219,232,0.04)' }}
          >
            <svg
              width="16"
              height="8"
              viewBox="0 0 16 8"
              style={{
                color: 'rgba(46,219,232,0.25)',
                transition: 'color 200ms'
              }}
              className="hover:text-hud-accent"
            >
              <path
                d={isBottom ? 'M1 1 L8 7 L15 1' : 'M1 7 L8 1 L15 7'}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`relative ${className}`}
      style={{ zIndex: 40, position: 'relative' }}
    >
      {isBottom && drawerContent}

      <div className="relative" style={{ height: BAR_H }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 1 }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3"
          style={{ ...btnStyle, zIndex: 2 }}
        >
          {items.map((item) => {
            const isActive = activeId === item.id;
            const color = isActive ? '#2EDBE8' : 'rgba(46,219,232,0.30)';
            // Items with drawer content get a caret so it reads as a dropdown.
            const hasDrawer = item.content != null;
            // Point toward where the drawer opens (down for a top bar, up for a
            // bottom bar); flip 180° while open.
            const caretPointsDown = isBottom ? isActive : !isActive;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item.id)}
                className="relative flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] tracking-[0.15em] font-bold"
                style={{
                  color,
                  textShadow: isActive
                    ? '0 0 10px rgba(46,219,232,0.5)'
                    : 'none',
                  transition: 'color 200ms, text-shadow 200ms'
                }}
              >
                {item.label}
                {hasDrawer && (
                  <span
                    aria-hidden="true"
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '3px solid transparent',
                      borderRight: '3px solid transparent',
                      borderTop: `4px solid ${color}`,
                      transform: caretPointsDown ? 'none' : 'rotate(180deg)',
                      transition: 'transform 200ms, border-top-color 200ms',
                      opacity: 0.85
                    }}
                  />
                )}
                {isActive && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{
                      ...(isBottom ? { top: -1 } : { bottom: -1 }),
                      width: '50%',
                      height: 1,
                      backgroundColor: '#2EDBE8',
                      boxShadow: '0 0 8px rgba(46,219,232,0.6)'
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!isBottom && drawerContent}
    </div>
  );
};

HudNavDrawer.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      content: PropTypes.node
    })
  ),
  position: PropTypes.oneOf(['top', 'bottom']),
  defaultActiveId: PropTypes.string,
  className: PropTypes.string,
  mode: PropTypes.oneOf(['toggle', 'select']),
  onTabChange: PropTypes.func
};

export default HudNavDrawer;
