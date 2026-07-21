import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

/**
 * SVG overlay that draws an elbow-routed callout line from a hex
 * node to the panel anchor point. Includes periodic glitch effect.
 */
const CalloutLine = ({ hexX, hexY, endX, endY, color = '#2EDBE8' }) => {
  // Lunar-callout elbow routing: a 45° diagonal plus one straight segment,
  // never a plain straight line. If the horizontal run dominates, go 45°
  // first then horizontal into the target; if the rise dominates, go
  // vertical first then finish with the 45° into the target.
  const run = Math.abs(endX - hexX);
  const rise = Math.abs(endY - hexY);
  const sx = Math.sign(endX - hexX) || 1;
  const sy = Math.sign(endY - hexY) || 1;
  const path =
    run >= rise
      ? `M ${hexX} ${hexY} L ${hexX + sx * rise} ${endY} L ${endX} ${endY}`
      : `M ${hexX} ${hexY} L ${hexX} ${hexY + sy * (rise - run)} L ${endX} ${endY}`;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-[31]"
      style={{ animation: 'callout-glitch 6s ease-in-out infinite' }}
    >
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

      {/* Main callout line — draws out from the hex on open, retracts on
          close (pathLength). Strong enough to read even on the short runs
          from the side hexes and across brighter panel chrome. */}
      <motion.path
        d={path}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.8"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        exit={{ pathLength: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />

      {/* End dot — lands once the line arrives */}
      <motion.circle
        cx={endX}
        cy={endY}
        r="3.5"
        fill={color}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9, transition: { delay: 0.3, duration: 0.15 } }}
        exit={{ opacity: 0, transition: { duration: 0.1 } }}
      />

      {/* Start dot */}
      <motion.circle
        cx={hexX}
        cy={hexY}
        r="2"
        fill={color}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9, transition: { duration: 0.15 } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      />

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
