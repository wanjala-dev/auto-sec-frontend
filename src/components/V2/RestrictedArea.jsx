import React from 'react';
import PropTypes from 'prop-types';
import HudButton from './HudButton';

/**
 * V2 sci-fi status panel — configurable for error, info, or warning states.
 *
 * Variants:
 *  - 'error' (default): red banner — restricted area / access denied
 *  - 'info': cyan banner — informational / coming soon
 *  - 'warning': amber banner — caution / in progress
 */
const VARIANTS = {
  error: {
    bg: 'bg-red-600',
    text: 'text-red-600',
    border: 'border-red-600/20',
    icon: '—'
  },
  info: {
    bg: 'bg-cyan-600',
    text: 'text-cyan-500',
    border: 'border-cyan-500/20',
    icon: 'i'
  },
  warning: {
    bg: 'bg-amber-500',
    text: 'text-amber-500',
    border: 'border-amber-500/20',
    icon: '!'
  }
};

const RestrictedArea = ({
  title = 'RESTRICTED AREA',
  subtitle = 'AUTHORIZED PERSONNEL ONLY',
  message = 'You must be authenticated to reach this area.',
  variant = 'error',
  action,
  className = ''
}) => {
  const v = VARIANTS[variant] || VARIANTS.error;

  return (
    // Always fills + centers within its container, so every info/warning/error
    // usage is centered by default (no per-call wrapper needed).
    <div className={`flex h-full w-full items-center justify-center p-4 ${className}`}>
      <div className="relative w-full max-w-lg">
        {/* Outer frame */}
        <div className="relative border border-gray-700/40 bg-[#0a0f1a]/90 backdrop-blur-sm p-1">
          {/* Hazard stripes — top corners */}
          <svg
            className="absolute -top-1 -left-1 w-12 h-4"
            viewBox="0 0 48 16"
            xmlns="http://www.w3.org/2000/svg"
          >
            {[0, 8, 16, 24, 32, 40].map((x) => (
              <rect
                key={x}
                x={x}
                y="0"
                width="4"
                height="16"
                fill="#475569"
                opacity="0.4"
                transform="skewX(-20)"
              />
            ))}
          </svg>
          <svg
            className="absolute -top-1 -right-1 w-12 h-4"
            viewBox="0 0 48 16"
            xmlns="http://www.w3.org/2000/svg"
          >
            {[0, 8, 16, 24, 32, 40].map((x) => (
              <rect
                key={x}
                x={x}
                y="0"
                width="4"
                height="16"
                fill="#475569"
                opacity="0.4"
                transform="skewX(-20)"
              />
            ))}
          </svg>

          {/* Inner frame */}
          <div className="border border-gray-700/30 px-6 py-5">
            {/* Corner accents */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-gray-600/40" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-gray-600/40" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-gray-600/40" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-gray-600/40" />

            {/* Banner */}
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex-1 ${v.bg} px-4 py-2`}>
                <span className="text-sm font-mono font-bold text-white tracking-[0.15em]">
                  {title}
                </span>
              </div>
              <div
                className={`h-8 w-8 ${v.bg} flex items-center justify-center flex-shrink-0`}
              >
                <span className="text-white text-lg font-bold">{v.icon}</span>
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-[11px] font-mono tracking-[0.2em] text-hud-dim mb-4">
              {subtitle}
            </p>

            {/* Message */}
            <p className="text-[12px] font-mono text-hud-dim mb-4">
              {message}
            </p>

            {/* Optional action button */}
            {action && (
              <HudButton
                variant={variant === 'error' ? 'primary' : 'ghost'}
                onClick={action.onClick}
                className="!text-[10px]"
              >
                {action.label}
              </HudButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

RestrictedArea.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  message: PropTypes.string,
  variant: PropTypes.oneOf(['error', 'info', 'warning']),
  action: PropTypes.shape({
    label: PropTypes.string,
    onClick: PropTypes.func
  }),
  className: PropTypes.string
};

export default RestrictedArea;
