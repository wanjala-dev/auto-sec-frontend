import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import HexEyeLogo from './HexEyeLogo';

/**
 * HexLoader — V2 loading spinner.
 *
 * A hexagonal (six-sided) progress indicator with the Octopus logo in the
 * centre. A bright "head" travels around the six sides of the hexagon (with a
 * fading trail), reading like a circular loader routed along a hexagon — the
 * V2 command-center loading motif. Canvas-drawn (same primitive we use for the
 * HUD ring / workflow graphics) so the glow and trail are crisp at any DPR.
 *
 * Usage:  <HexLoader />            // 96px default
 *         <HexLoader size={140} label="INGESTING TELEMETRY" />
 */
const HexLoader = ({ size = 96, color = '#2EDBE8', label, speed = 1 }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.42;

    // Six hexagon vertices (flat-top), starting at the top-right.
    const verts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });

    // Point along the hexagon perimeter for t in [0,1).
    const pointAt = (t) => {
      const seg = t * 6;
      const i = Math.floor(seg) % 6;
      const f = seg - Math.floor(seg);
      const a = verts[i];
      const b = verts[(i + 1) % 6];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    };

    const drawHexPath = () => {
      ctx.beginPath();
      verts.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)));
      ctx.closePath();
    };

    const start = performance.now();
    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Dim base hexagon
      drawHexPath();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Traveling head + fading trail
      const head = ((performance.now() - start) / (1600 / speed)) % 1;
      const TRAIL = 30;
      ctx.lineCap = 'round';
      for (let k = TRAIL; k >= 0; k--) {
        const t = (head - k / (TRAIL * 6) + 1) % 1;
        const p0 = pointAt(t);
        const p1 = pointAt((t + 0.004 + 1) % 1);
        const a = (1 - k / TRAIL) ** 2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = a;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = k === 0 ? 10 : 4;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(rafRef.current);
  }, [size, color, speed]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <canvas ref={canvasRef} style={{ width: size, height: size }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <HexEyeLogo
            style={{ width: size * 0.34, height: size * 0.34 }}
            className="animate-pulse"
          />
        </div>
      </div>
      {label && (
        <span
          className="text-[9px] font-mono font-semibold tracking-[0.2em]"
          style={{ color }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

HexLoader.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
  label: PropTypes.string,
  speed: PropTypes.number
};

export default HexLoader;
