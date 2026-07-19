import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * V2 HUD vertical side nav with canvas-drawn notch and slide-out drawer.
 *
 * A vertical bump on the left edge — just the notch shape (no long lines).
 * Buttons are stacked vertically (text rotated). Clicking one slides a
 * panel out to the right. Top/bottom ends fade out naturally.
 */

const GLOW = 'rgba(46,219,232,0.6)';
const LINE = 'rgba(46,219,232,0.25)';
const NOTCH_W = 28; // how far the notch protrudes from the edge
const WING = 35; // vertical length of the angled part
const BTN_W = 42; // width of the button rail
const DRAWER_W = 320;
const FADE = 30; // px to fade at top and bottom ends

/**
 * Draw the side nav frame. When drawerW > 0 (open), draws a full border
 * around the entire unit (drawer + rail) with the notch on the right.
 * When closed, just the notch fading in/out.
 */
const drawFrame = (canvas, itemCount, drawerW, side = 'left') => {
  const parent = canvas.parentElement;
  if (!parent) return;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  if (w < 5 || h < 10) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Mirror horizontally for right side
  if (side === 'right') {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  // Notch geometry — centered vertically
  const notchH = itemCount * 58 + WING * 2 + 24;
  const notchTop = (h - notchH) / 2;
  const notchBot = notchTop + notchH;

  // The notch is on the RIGHT side of the container (the rail edge)
  const railRight = w; // right edge of rail = right edge of container
  const railLeft = w - BTN_W; // left edge of rail
  const notchRight = railLeft + NOTCH_W; // how far the bump protrudes

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'butt';

  const isOpen = drawerW > 10;

  const drawSeg = (from, to, alphaStart, alphaEnd, steps) => {
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const sx = from[0] + (to[0] - from[0]) * t0;
      const sy = from[1] + (to[1] - from[1]) * t0;
      const ex = from[0] + (to[0] - from[0]) * t1;
      const ey = from[1] + (to[1] - from[1]) * t1;
      ctx.globalAlpha = alphaStart + (alphaEnd - alphaStart) * t0;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
  };

  if (isOpen) {
    // ── OPEN: draw ONLY the rail notch; the drawer body border is CSS ──
    ctx.globalAlpha = 1;

    const notchInner = railLeft; // where the notch angles start
    const notchOuter = railRight - 0.5; // rightmost point of the bump

    // Rail notch ONLY — the protruding button rail keeps its border. The drawer
    // body's border + chamfer are drawn in CSS (two-layer clip, like HudCard), so
    // we deliberately do NOT stroke the drawer-body edges here — otherwise a square
    // corner shows through the CSS chamfer cut.
    // Just the protruding bump — start/end ON the drawer's right edge, no
    // vertical run up to the top/bottom corners (those would poke past the CSS
    // chamfer). The drawer body's CSS border covers the rest of the right edge.
    const notchPath = () => {
      ctx.moveTo(notchInner, notchTop + WING * 0.3);
      ctx.lineTo(notchOuter, notchTop + WING);
      ctx.lineTo(notchOuter, notchBot - WING);
      ctx.lineTo(notchInner, notchBot - WING * 0.3);
    };

    ctx.beginPath();
    notchPath();
    ctx.stroke();

    // Glow pass on the notch
    ctx.save();
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = GLOW;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    notchPath();
    ctx.stroke();
    ctx.restore();

    // Notch corner dots (rail bump only)
    [
      [notchInner, notchTop + WING * 0.3],
      [notchOuter, notchTop + WING],
      [notchOuter, notchBot - WING],
      [notchInner, notchBot - WING * 0.3]
    ].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = GLOW;
      ctx.globalAlpha = 1;
      ctx.fill();
    });

    // (No panel fill — it would fill the square shape and poke a corner past the
    // CSS chamfer. The drawer body's own bg + chamfer cover this.)
  } else {
    // ── CLOSED: just the notch on the rail ──
    const x1 = 0.5;
    const x2 = NOTCH_W + 0.5;

    const pts = [
      [x1, notchTop],
      [x1, notchTop + WING * 0.3],
      [x2, notchTop + WING],
      [x2, notchBot - WING],
      [x1, notchBot - WING * 0.3],
      [x1, notchBot]
    ];

    // Top fade
    drawSeg(pts[0], pts[1], 0, 1, 8);
    // Top angle
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.stroke();
    // Right edge
    ctx.beginPath();
    ctx.moveTo(pts[2][0], pts[2][1]);
    ctx.lineTo(pts[3][0], pts[3][1]);
    ctx.stroke();
    // Bottom angle
    ctx.beginPath();
    ctx.moveTo(pts[3][0], pts[3][1]);
    ctx.lineTo(pts[4][0], pts[4][1]);
    ctx.stroke();
    // Bottom fade
    drawSeg(pts[4], pts[5], 1, 0, 8);

    // Glow
    ctx.save();
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = GLOW;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.lineTo(pts[3][0], pts[3][1]);
    ctx.lineTo(pts[4][0], pts[4][1]);
    ctx.stroke();
    ctx.restore();

    // Fill
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.lineTo(pts[3][0], pts[3][1]);
    ctx.lineTo(pts[4][0], pts[4][1]);
    ctx.closePath();
    const grad = ctx.createLinearGradient(x1, 0, x2, 0);
    grad.addColorStop(0, 'rgba(46,219,232,0.01)');
    grad.addColorStop(1, 'rgba(46,219,232,0.05)');
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
  }
};

const HudSideNav = ({
  items = [],
  defaultActiveId = null,
  side = 'left',
  className = '',
  onOpenChange
}) => {
  const isRight = side === 'right';
  const canvasRef = useRef(null);
  const [activeId, setActiveId] = useState(defaultActiveId);
  const [renderedId, setRenderedId] = useState(defaultActiveId);

  useEffect(() => {
    if (activeId) {
      setRenderedId(activeId);
    } else {
      const t = setTimeout(() => setRenderedId(null), 350);
      return () => clearTimeout(t);
    }
  }, [activeId]);

  // Report open/closed so the parent can yield overlapping chrome (e.g. the
  // operator badge that would otherwise float over this drawer).
  useEffect(() => {
    onOpenChange?.(!!activeId);
  }, [activeId, onOpenChange]);

  const handleClick = useCallback((id) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);

  const isOpen = !!activeId;
  const drawerW = isOpen ? DRAWER_W : 0;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => drawFrame(canvas, items.length, drawerW, side);
    draw();
    const t = setTimeout(draw, 50);
    // Also redraw during the transition (every frame for 300ms)
    let frameId;
    let start = Date.now();
    const animDraw = () => {
      drawFrame(canvas, items.length, drawerW, side);
      if (Date.now() - start < 350) {
        frameId = requestAnimationFrame(animDraw);
      }
    };
    frameId = requestAnimationFrame(animDraw);

    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(frameId);
      ro.disconnect();
    };
  }, [items.length, drawerW, side]);

  const renderedItem = renderedId
    ? items.find((i) => i.id === renderedId)
    : null;

  const totalW = isOpen ? DRAWER_W + BTN_W : BTN_W;

  return (
    <div
      className={`flex-shrink-0 h-full relative ${className}`}
      style={{
        zIndex: 35,
        width: totalW,
        transition: 'width 400ms cubic-bezier(0.25,0.1,0.25,1)',
        overflow: 'hidden'
      }}
    >
      {/* Canvas — covers the entire unit, redraws for open/closed */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 3 }}
      />

      {/* Inner flex: [drawer][rail] — reversed for right side */}
      <div
        className="flex h-full"
        style={isRight ? { flexDirection: 'row-reverse' } : undefined}
      >
        {/* Drawer — sits to the LEFT of the rail, slides in/out */}
        <div
          className="flex-shrink-0 h-full overflow-hidden"
          style={{
            width: isOpen ? DRAWER_W : 0,
            opacity: isOpen ? 1 : 0,
            transition:
              'width 400ms cubic-bezier(0.25,0.1,0.25,1), opacity 350ms ease'
          }}
        >
          <div
            className="relative h-full bg-cyan-500/30"
            style={{
              width: DRAWER_W,
              zIndex: 5,
              padding: '1.5px',
              clipPath: isRight
                ? 'polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px)'
                : 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)'
            }}
          >
            <div
              className="h-full bg-hud-surface/50 backdrop-blur-md overflow-hidden"
              style={{
                clipPath: isRight
                  ? 'polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px)'
                  : 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)'
              }}
            >
            {renderedItem && (
              <div className="flex items-center justify-between px-3 py-2 border-b border-hud-line/[0.06]">
                <span
                  className="text-[9px] font-mono font-bold tracking-[0.15em]"
                  style={{ color: '#2EDBE8' }}
                >
                  {renderedItem.label}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  aria-label="Close"
                  className="text-[14px] leading-none font-mono text-hud-dim hover:text-hud-accent hover:bg-cyan-500/10 transition px-1.5 py-0.5"
                >
                  ✕
                </button>
              </div>
            )}
            <div
              className="overflow-auto cc-scrollbar"
              style={{ maxHeight: 'calc(100% - 32px)' }}
            >
              {renderedItem?.content}
            </div>
            </div>
          </div>
        </div>

        {/* Button rail — rides at the right edge, moves with the drawer */}
        <div className="relative flex-shrink-0 h-full" style={{ width: BTN_W }}>
          <div
            className="absolute left-0 right-0 flex flex-col items-center justify-center gap-0"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              height: items.length * 58 + 24
            }}
          >
            {items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleClick(item.id)}
                  className="relative font-mono font-bold flex items-center justify-center"
                  style={{
                    color: isActive ? '#2EDBE8' : 'rgba(46,219,232,0.30)',
                    textShadow: isActive
                      ? '0 0 8px rgba(46,219,232,0.5)'
                      : 'none',
                    transition: 'color 200ms, text-shadow 200ms',
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    fontSize: 8,
                    letterSpacing: '0.12em',
                    padding: '14px 4px',
                    width: '100%'
                  }}
                  title={item.label}
                >
                  {item.label}
                  {isActive && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2"
                      style={{
                        width: 2,
                        height: '50%',
                        backgroundColor: '#2EDBE8',
                        boxShadow: '0 0 6px rgba(46,219,232,0.6)'
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

HudSideNav.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.string,
      content: PropTypes.node
    })
  ),
  defaultActiveId: PropTypes.string,
  className: PropTypes.string,
  onOpenChange: PropTypes.func
};

export default HudSideNav;
