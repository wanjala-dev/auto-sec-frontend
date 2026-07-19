import React from 'react';
import PropTypes from 'prop-types';

/**
 * SVG overlay that draws an elbow-routed callout line from a hex
 * node to the panel anchor point. Includes periodic glitch effect.
 */
const CalloutLine = ({ hexX, hexY, endX, endY, color = '#2EDBE8' }) => {
  const midX = hexX + (endX - hexX) * 0.4;
  const path = `M ${hexX} ${hexY} L ${midX} ${hexY} L ${endX} ${endY}`;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-[31]"
      style={{ animation: 'callout-glitch 6s ease-in-out infinite' }}
    >
      <defs>
        <filter id="callout-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ghost line — offset, only visible during glitch. Matches the selected
          node color so the whole callout reads as that item's lead. */}
      <path
        d={path}
        stroke={color}
        strokeWidth="0.5"
        fill="none"
        opacity="0"
        transform="translate(2, -1)"
        style={{ animation: 'callout-ghost 6s ease-in-out infinite' }}
      />

      {/* Main callout line */}
      <path
        d={path}
        stroke={color}
        strokeWidth="1"
        fill="none"
        opacity="0.35"
        strokeDasharray="4 3"
        filter="url(#callout-glow)"
      />

      {/* End dot */}
      <circle cx={endX} cy={endY} r="3.5" fill={color} opacity="0.5" />

      {/* Start dot */}
      <circle cx={hexX} cy={hexY} r="2" fill={color} opacity="0.5" />

      <style>
        {`
          @keyframes callout-glitch {
            0%, 89%, 91%, 93%, 95%, 100% {
              transform: translate(0, 0);
              opacity: 1;
            }
            89.5% {
              transform: translate(3px, -1px);
              opacity: 0.6;
            }
            90% {
              transform: translate(-2px, 1px);
              opacity: 0.4;
            }
            91.5% {
              transform: translate(1px, 0px);
              opacity: 0.8;
            }
            92% {
              transform: translate(0, 0);
              opacity: 0.3;
            }
            93.5% {
              transform: translate(-1px, 1px);
              opacity: 0.7;
            }
            94% {
              transform: translate(2px, -1px);
              opacity: 0.5;
            }
          }
          @keyframes callout-ghost {
            0%, 89%, 95%, 100% {
              opacity: 0;
            }
            90% {
              opacity: 0.3;
            }
            91% {
              opacity: 0;
            }
            93% {
              opacity: 0.2;
            }
            94% {
              opacity: 0;
            }
          }
        `}
      </style>
    </svg>
  );
};

CalloutLine.propTypes = {
  hexX: PropTypes.number.isRequired,
  hexY: PropTypes.number.isRequired,
  endX: PropTypes.number.isRequired,
  endY: PropTypes.number.isRequired,
  color: PropTypes.string
};

export default CalloutLine;
