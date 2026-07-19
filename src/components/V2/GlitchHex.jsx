import React, { useEffect, useRef } from 'react';

/**
 * GlitchHex — the reusable "electric lightning" glitch-pulse hexagon.
 *
 * This is the SAME algorithm the CommandCenter hex ring uses to flag an active
 * signal on the ALERTS / ANOMALIES / DETECTIONS nodes: a calm baseline with
 * intermittent flares, rare dark dropouts, and a high-frequency vibration during
 * a flare so it reads like a signal glitch / thunder crackle rather than a
 * smooth breathing loop. Layered incommensurate sines fake the randomness
 * deterministically (no per-frame strobing).
 *
 * Reuse it anywhere you need that "something is firing" feedback — the dashboard
 * hexes, a failed login, a live alert badge. Do NOT re-derive the sine stack.
 *
 * Props:
 *   size    — px (canvas is square), default 128
 *   color   — stroke/glow color, default alert red
 *   active  — when false, renders a calm static hex outline (no glitch)
 *   seed    — phase offset so multiple instances don't pulse in lockstep
 */
const hexPoints = (x, y, r) => {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  return pts;
};

const traceHex = (ctx, pts) => {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
};

export default function GlitchHex({
  size = 128,
  color = '#ff3b52',
  active = true,
  seed = 0
}) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const cx = size / 2;
    const cy = size / 2;
    const hexR = size * 0.26;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Alert-driven glitch halo (identical math to the CommandCenter hex ring).
      if (active) {
        const now =
          typeof performance !== 'undefined' ? performance.now() : Date.now();
        const base = 0.24 + 0.14 * Math.sin(now / 520 + seed);
        const t = now / 78 + seed;
        const noise = Math.abs(
          Math.sin(t) * Math.sin(t * 1.7) * Math.sin(t * 0.31)
        );
        const flare = noise > 0.78 ? (noise - 0.78) / 0.22 : 0;
        let pulse = Math.min(1, base + flare * 1.2);
        if (Math.sin(now / 43 + seed) * Math.sin(now / 131) > 0.985)
          pulse *= 0.15;
        const buzz = 2 + flare * 5.5;
        const gx = flare > 0.15 ? Math.sin(now * 3.6 + seed) * buzz : 0;
        const gy = flare > 0.15 ? Math.cos(now * 4.3) * buzz : 0;

        const halo = hexPoints(cx + gx, cy + gy, hexR * (1.2 + pulse * 0.55));
        ctx.save();
        traceHex(ctx, halo);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.09 + pulse * 0.52;
        ctx.lineWidth = 1 + flare * 1.1;
        ctx.shadowColor = color;
        ctx.shadowBlur = 2 + pulse * 13;
        ctx.stroke();
        ctx.restore();
      }

      // Core hexagon outline.
      traceHex(ctx, hexPoints(cx, cy, hexR));
      ctx.strokeStyle = color;
      ctx.globalAlpha = active ? 0.85 : 0.35;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [size, color, active, seed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: 'block' }}
    />
  );
}
