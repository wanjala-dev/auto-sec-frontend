import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * V2 HUD-themed credit/debit card visual.
 *
 * Chamfered top-right AND bottom-left corners. Metallic translucent finish.
 * Circuit-line decorations. Monospace font.
 */

const BRAND_COLORS = {
  visa: '#2EDBE8',
  mastercard: '#F59E0B',
  amex: '#34d399',
  discover: '#F97316',
  default: '#2EDBE8'
};

const BRAND_LABELS = {
  visa: 'VISA',
  mastercard: 'MASTERCARD',
  amex: 'AMEX',
  discover: 'DISCOVER'
};

const formatCurrency = (value) => {
  const n = Number(value) || 0;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

const CHAMFER = 18;

// Chamfer top-right AND bottom-left
const CARD_CLIP = `polygon(0 0, calc(100% - ${CHAMFER}px) 0, 100% ${CHAMFER}px, 100% 100%, ${CHAMFER}px 100%, 0 calc(100% - ${CHAMFER}px))`;

const HudChip = ({ size = 28 }) => {
  const h = Math.round((size * 20) / 28);
  return (
    <svg width={size} height={h} viewBox="0 0 28 20" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="27"
        height="19"
        fill="rgba(201,169,78,0.12)"
        stroke="rgba(201,169,78,0.35)"
      />
      <line x1="0" y1="7" x2="28" y2="7" stroke="rgba(201,169,78,0.2)" />
      <line x1="0" y1="13" x2="28" y2="13" stroke="rgba(201,169,78,0.2)" />
      <line x1="10" y1="0" x2="10" y2="20" stroke="rgba(201,169,78,0.2)" />
      <line x1="18" y1="0" x2="18" y2="20" stroke="rgba(201,169,78,0.2)" />
    </svg>
  );
};

const CardBorder = ({ accent }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
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

      const C = CHAMFER;

      // Border path — exact match to CARD_CLIP
      const buildPath = () => {
        ctx.beginPath();
        ctx.moveTo(0.5, 0.5);
        ctx.lineTo(w - C, 0.5);
        ctx.lineTo(w - 0.5, C);
        ctx.lineTo(w - 0.5, h - 0.5);
        ctx.lineTo(C, h - 0.5);
        ctx.lineTo(0.5, h - C);
        ctx.closePath();
      };

      // Main border
      buildPath();
      ctx.strokeStyle = accent + '60';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glow on chamfer edges only
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = accent + '90';
      ctx.lineWidth = 1;
      // Top-right chamfer
      ctx.beginPath();
      ctx.moveTo(w - C, 0.5);
      ctx.lineTo(w - 0.5, C);
      ctx.stroke();
      // Bottom-left chamfer
      ctx.beginPath();
      ctx.moveTo(C, h - 0.5);
      ctx.lineTo(0.5, h - C);
      ctx.stroke();
      ctx.restore();

      // Corner dots
      [
        [0.5, 0.5],
        [w - C, 0.5],
        [w - 0.5, C],
        [w - 0.5, h - 0.5],
        [C, h - 0.5],
        [0.5, h - C]
      ].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = accent + '40';
        ctx.fill();
      });

      // Circuit traces
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.08;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.38);
      ctx.lineTo(w * 0.12, h * 0.38);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.18, h * 0.38);
      ctx.lineTo(w * 0.4, h * 0.38);
      ctx.stroke();
      ctx.globalAlpha = 0.06;
      ctx.beginPath();
      ctx.moveTo(w * 0.55, h * 0.68);
      ctx.lineTo(w, h * 0.68);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Circuit nodes
      [
        { x: w * 0.12, y: h * 0.38 },
        { x: w * 0.55, y: h * 0.68 }
      ].forEach(({ x, y }) => {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = accent + '18';
        ctx.fill();
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [accent]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    />
  );
};

/* Shared face styles */
const faceBase = {
  position: 'absolute',
  inset: 0,
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  clipPath: CARD_CLIP
};

const metalBg = {
  background:
    'linear-gradient(145deg, rgba(18,30,50,0.55) 0%, rgba(8,16,30,0.6) 40%, rgba(12,22,42,0.55) 100%)',
  backdropFilter: 'blur(12px)'
};

const sheen = {
  background:
    'linear-gradient(125deg, rgba(255,255,255,0.04) 0%, transparent 40%, rgba(255,255,255,0.02) 60%, transparent 100%)'
};

const HudPaymentCard = ({
  card = {},
  onClick,
  size = 'sm',
  className = ''
}) => {
  const [flipped, setFlipped] = useState(false);
  const brand = (card.brand || '').toLowerCase();
  const accent = BRAND_COLORS[brand] || BRAND_COLORS.default;
  const label = BRAND_LABELS[brand] || brand.toUpperCase() || 'CARD';
  const isLg = size === 'lg';

  const defaultW = isLg ? 340 : 260;
  const defaultH = isLg ? 210 : 165;

  const handleFlip = useCallback((e) => {
    e.stopPropagation();
    setFlipped((f) => !f);
  }, []);

  return (
    <div
      onClick={onClick}
      className={`flex-shrink-0 font-mono ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minWidth: defaultW,
        minHeight: defaultH,
        perspective: 1200
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 650ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* ═══ FRONT FACE ═══ */}
        <div style={faceBase}>
          <div className="absolute inset-0" style={metalBg} />
          <div className="absolute inset-0 pointer-events-none" style={sheen} />
          <CardBorder accent={accent} />

          <div className="relative z-10 h-full flex flex-col justify-between p-3.5">
            {/* Top: balance + chip */}
            <div className="flex items-start justify-between">
              <div>
                <p
                  className="tracking-[0.12em]"
                  style={{ fontSize: 8, color: `${accent}80` }}
                >
                  BALANCE
                </p>
                <p
                  className="font-bold tabular-nums"
                  style={{
                    fontSize: isLg ? 24 : 18,
                    color: accent,
                    textShadow: `0 0 10px ${accent}25`
                  }}
                >
                  {formatCurrency(card.total_charged)}
                </p>
              </div>
              <HudChip size={isLg ? 34 : 26} />
            </div>

            {/* Card number — click to flip */}
            <button
              type="button"
              onClick={handleFlip}
              className="text-left cursor-pointer transition hover:opacity-70"
              title="Click to flip"
            >
              <p
                className="tabular-nums"
                style={{
                  fontSize: isLg ? 14 : 11,
                  color: 'rgba(209,213,219,0.35)',
                  letterSpacing: '0.3em'
                }}
              >
                ····&nbsp;&nbsp;····&nbsp;&nbsp;····&nbsp;&nbsp;
                {card.last4 || '0000'}
              </p>
            </button>

            {/* Bottom: brand + expiry + default */}
            <div className="flex items-end justify-between">
              <p
                className="font-bold tracking-[0.15em]"
                style={{
                  fontSize: isLg ? 13 : 11,
                  color: accent,
                  textShadow: `0 0 6px ${accent}20`
                }}
              >
                {label}
              </p>
              <div className="flex items-end gap-2">
                {card.exp_month && card.exp_year && (
                  <div className="text-right">
                    <p
                      className="tracking-wider"
                      style={{ fontSize: 7, color: 'rgba(107,114,128,0.5)' }}
                    >
                      EXPIRES
                    </p>
                    <p
                      className="tabular-nums font-bold"
                      style={{
                        fontSize: isLg ? 11 : 9,
                        color: 'rgba(209,213,219,0.45)'
                      }}
                    >
                      {String(card.exp_month).padStart(2, '0')}/
                      {String(card.exp_year).slice(-2)}
                    </p>
                  </div>
                )}
                {card.is_default && (
                  <span
                    className="tracking-wider font-bold"
                    style={{
                      fontSize: 7,
                      color: '#34d399',
                      border: '1px solid rgba(52,211,153,0.2)',
                      padding: '1px 5px',
                      backgroundColor: 'rgba(52,211,153,0.05)'
                    }}
                  >
                    DEFAULT
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ BACK FACE ═══ */}
        <div style={{ ...faceBase, transform: 'rotateY(180deg)' }}>
          <div className="absolute inset-0" style={metalBg} />
          <div className="absolute inset-0 pointer-events-none" style={sheen} />
          <CardBorder accent={accent} />

          <div className="relative z-10 h-full flex flex-col p-3.5">
            {/* Magnetic stripe */}
            <div
              style={{
                height: isLg ? 32 : 24,
                background:
                  'linear-gradient(180deg, rgba(20,20,30,0.9) 0%, rgba(30,30,45,0.8) 100%)',
                marginLeft: -14,
                marginRight: -14,
                marginTop: isLg ? 8 : 4
              }}
            />

            {/* Signature strip + CVV */}
            <div className="flex items-center gap-2 mt-4">
              <div
                className="flex-1"
                style={{
                  height: isLg ? 28 : 22,
                  background:
                    'linear-gradient(90deg, rgba(46,219,232,0.03) 0%, rgba(46,219,232,0.06) 100%)',
                  border: `1px solid ${accent}15`
                }}
              />
              <div
                className="flex items-center justify-center"
                style={{
                  width: isLg ? 48 : 38,
                  height: isLg ? 28 : 22,
                  border: `1px solid ${accent}20`,
                  backgroundColor: 'rgba(0,0,0,0.3)'
                }}
              >
                <span
                  className="font-bold tabular-nums"
                  style={{
                    fontSize: isLg ? 13 : 10,
                    color: accent,
                    letterSpacing: '0.15em'
                  }}
                >
                  {card.cvv || '•••'}
                </span>
              </div>
            </div>

            {/* Info section */}
            <div className="flex-1 flex flex-col justify-end">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p
                    style={{
                      fontSize: 8,
                      color: `${accent}50`,
                      letterSpacing: '0.12em'
                    }}
                  >
                    CARDHOLDER
                  </p>
                  <p
                    style={{
                      fontSize: 8,
                      color: `${accent}50`,
                      letterSpacing: '0.12em'
                    }}
                  >
                    NETWORK
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p
                    className="font-bold"
                    style={{
                      fontSize: isLg ? 11 : 9,
                      color: 'rgba(209,213,219,0.5)'
                    }}
                  >
                    {card.holderName || 'AUTHORIZED USER'}
                  </p>
                  <p
                    className="font-bold tracking-[0.15em]"
                    style={{ fontSize: isLg ? 11 : 9, color: accent }}
                  >
                    {label}
                  </p>
                </div>
              </div>

              {/* Tap to flip back hint */}
              <button
                type="button"
                onClick={handleFlip}
                className="mt-2 w-full text-center transition hover:opacity-70"
                style={{
                  fontSize: 8,
                  color: 'rgba(107,114,128,0.4)',
                  letterSpacing: '0.15em'
                }}
              >
                TAP TO FLIP BACK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

HudPaymentCard.propTypes = {
  card: PropTypes.shape({
    brand: PropTypes.string,
    last4: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    exp_month: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    exp_year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    total_charged: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    is_default: PropTypes.bool,
    cvv: PropTypes.string,
    holderName: PropTypes.string
  }),
  onClick: PropTypes.func,
  size: PropTypes.oneOf(['sm', 'lg']),
  className: PropTypes.string
};

export default HudPaymentCard;
