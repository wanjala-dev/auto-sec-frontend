import { useEffect, useRef } from 'react';
import { STATUS_COLORS } from './v2Constants';
import { hudAccentHex, hudAccentRgba } from './hudCanvasTheme';

/**
 * HTML5 Canvas ring system for the V2 Command Center.
 * Draws concentric rings, agent hexagons, health arc, campaign arcs,
 * donation dots, compass ticks, and center text at 60fps.
 */
const CoreCanvas = ({
  agents,
  healthPct = 98,
  onHexClick,
  containerRef,
  activeHexId,
  centerLabel = 'SYSTEM HEALTH'
}) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const R = {
      outerTicks: 0.44,
      outer: 0.42,
      agentOrbit: 0.38,
      data1: 0.33,
      data2: 0.29,
      health: 0.26,
      inner1: 0.22,
      inner2: 0.19,
      inner3: 0.16,
      core: 0.12,
      coreInner: 0.095
    };

    const drawHex = (ctx, x, y, r, fillColor, strokeColor, lw) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = x + r * Math.cos(a);
        const py = y + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lw;
      ctx.stroke();
    };

    const drawArc = (ctx, cx, cy, r, s, e, color, lw, alpha, blur) => {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = blur || 0;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, r, s, e);
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = 'butt';
      ctx.stroke();
      ctx.restore();
    };

    const drawGlowCircle = (ctx, cx, cy, r, color, alpha, blur) => {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    };

    const draw = (time) => {
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w / dpr, h / dpr);

      // Theme-aware accent — neon cyan (dark) or daylight teal (light).
      const ACCENT = hudAccentHex(canvas);

      const cw = w / dpr;
      const ch = h / dpr;
      const cx = cw / 2;
      const cy = ch / 2;
      const scale = Math.min(cw, ch);
      const rot = time * 0.0001;

      // Ambient glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.48);
      grd.addColorStop(0, hudAccentRgba(canvas, 0.04));
      grd.addColorStop(0.6, 'rgba(124,77,255,0.015)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, cw, ch);

      // Outer tick marks
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2 + rot * 0.1;
        const major = i % 10 === 0;
        const mid = i % 5 === 0;
        const r1 = scale * R.outerTicks;
        const r2 =
          r1 + (major ? scale * 0.016 : mid ? scale * 0.01 : scale * 0.005);
        ctx.beginPath();
        ctx.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
        ctx.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a));
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = major ? 1.2 : mid ? 0.6 : 0.3;
        ctx.globalAlpha = major ? 0.3 : mid ? 0.15 : 0.07;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Compass labels
      const labels = [
        'N',
        '030',
        '060',
        'E',
        '120',
        '150',
        'S',
        '210',
        '240',
        'W',
        '300',
        '330'
      ];
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = ACCENT;
      labels.forEach((l, i) => {
        const a = (i / 12) * Math.PI * 2 + rot * 0.1;
        const r = scale * (R.outerTicks + 0.03);
        ctx.fillText(l, cx + r * Math.cos(a), cy + r * Math.sin(a));
      });
      ctx.globalAlpha = 1;

      // Outer ring
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.setLineDash([3, 8]);
      ctx.beginPath();
      ctx.arc(cx, cy, scale * R.outer, rot, rot + Math.PI * 2);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Agent orbit ring
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        scale * R.agentOrbit,
        -rot * 0.7,
        -rot * 0.7 + Math.PI * 2
      );
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Campaign data arcs
      const campaigns = [
        { pct: 0.72, color: '#EC4899' },
        { pct: 0.45, color: '#F59E0B' },
        { pct: 0.88, color: '#34d399' }
      ];
      const gap = 0.04;
      const segSize = (1 - gap * campaigns.length) / campaigns.length;
      drawArc(
        ctx,
        cx,
        cy,
        scale * R.data1,
        0,
        Math.PI * 2,
        '#1e293b',
        5,
        0.2,
        0
      );
      campaigns.forEach((c, i) => {
        const start = i * (segSize + gap) * Math.PI * 2 - Math.PI / 2;
        const end = start + segSize * c.pct * Math.PI * 2;
        drawArc(ctx, cx, cy, scale * R.data1, start, end, c.color, 5, 0.6, 4);
      });

      // Donation activity dots
      drawArc(
        ctx,
        cx,
        cy,
        scale * R.data2,
        0,
        Math.PI * 2,
        '#334155',
        0.4,
        0.15,
        0
      );
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const active = (i * 7 + 3) % 5 !== 0;
        ctx.beginPath();
        ctx.arc(
          cx + scale * R.data2 * Math.cos(a),
          cy + scale * R.data2 * Math.sin(a),
          active ? 3 : 1.5,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = active ? ACCENT : '#334155';
        ctx.globalAlpha = active ? 0.5 : 0.2;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Health arc
      drawArc(
        ctx,
        cx,
        cy,
        scale * R.health,
        0,
        Math.PI * 2,
        '#1e293b',
        4,
        0.25,
        0
      );
      drawArc(
        ctx,
        cx,
        cy,
        scale * R.health,
        -Math.PI / 2,
        (healthPct / 100) * Math.PI * 2 - Math.PI / 2,
        ACCENT,
        4,
        0.7,
        8
      );

      // Inner decorative rings
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.setLineDash([12, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, scale * R.inner1, -rot * 1.2, -rot * 1.2 + Math.PI * 2);
      ctx.strokeStyle = '#7C4DFF';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.setLineDash([4, 6]);
      ctx.globalAlpha = 0.07;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * R.inner2, rot * 0.8, rot * 0.8 + Math.PI * 2);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 0.3;
      ctx.stroke();
      ctx.setLineDash([2, 5]);
      ctx.globalAlpha = 0.05;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * R.inner3, -rot * 1.5, -rot * 1.5 + Math.PI * 2);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 0.3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Core rings
      drawGlowCircle(ctx, cx, cy, scale * R.core, ACCENT, 0.12, 4);
      drawGlowCircle(ctx, cx, cy, scale * R.coreInner, '#34d399', 0.08, 0);

      // Agent hexagons
      agents.forEach((a, i) => {
        const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
        const ax = cx + scale * R.agentOrbit * Math.cos(angle);
        const ay = cy + scale * R.agentOrbit * Math.sin(angle);
        const col = STATUS_COLORS[a.status] || '#6B7280';
        const hexR = scale * 0.025;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = col;
        ctx.lineWidth = 0.3;
        ctx.globalAlpha = 0.06;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        const isActive = a.id === activeHexId;
        drawHex(
          ctx,
          ax,
          ay,
          hexR,
          isActive ? `${col}20` : 'rgba(2,3,9,0.85)',
          col,
          isActive ? 2.5 : 1.5
        );

        if (isActive) {
          ctx.save();
          ctx.beginPath();
          for (let v = 0; v < 6; v++) {
            const pa = (Math.PI / 3) * v - Math.PI / 6;
            const px = ax + (hexR + 4) * Math.cos(pa);
            const py = ay + (hexR + 4) * Math.sin(pa);
            v === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = col;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.4 + 0.2 * Math.sin((time / 1000) * 3);
          ctx.shadowColor = col;
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          ctx.restore();
        }

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = col;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(a.icon, ax, ay + 1);

        ctx.font = '7px monospace';
        ctx.fillStyle = '#4B5563';
        ctx.globalAlpha = 0.7;
        ctx.fillText(a.label.toUpperCase(), ax, ay + hexR + 12);
        ctx.globalAlpha = 1;

        ctx.font = '6px monospace';
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.4;
        ctx.fillText(String(a.tasks), ax, ay - hexR - 6);
        ctx.globalAlpha = 1;
      });

      // Center text
      ctx.save();
      ctx.shadowColor = ACCENT;
      ctx.shadowBlur = 15;
      ctx.font = 'bold 32px monospace';
      ctx.fillStyle = ACCENT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(healthPct), cx, cy - 16);
      ctx.restore();

      ctx.font = '8px monospace';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.fillText(centerLabel, cx, cy + 2);

      ctx.font = '7px monospace';
      ctx.fillStyle = '#34d399';
      ctx.globalAlpha = 0.6;
      ctx.fillText('● OPERATIONAL', cx, cy + 28);
      ctx.globalAlpha = 1;

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    // Click handler for hexagons
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const sc = Math.min(rect.width, rect.height);
      const ccx = rect.width / 2;
      const ccy = rect.height / 2;

      agents.forEach((a, i) => {
        const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
        const ax = ccx + sc * R.agentOrbit * Math.cos(angle);
        const ay = ccy + sc * R.agentOrbit * Math.sin(angle);
        if (Math.sqrt((mx - ax) ** 2 + (my - ay) ** 2) < sc * 0.03) {
          onHexClick?.(a.id);
        }
      });
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      canvas.removeEventListener('click', handleClick);
    };
  }, [agents, healthPct, onHexClick, containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[12] cursor-pointer"
    />
  );
};

export default CoreCanvas;
