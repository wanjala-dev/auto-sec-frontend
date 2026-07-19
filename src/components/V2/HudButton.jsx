import React from 'react';
import PropTypes from 'prop-types';
import { FiChevronRight } from 'react-icons/fi';

import './hudGlitch.css';

/**
 * V2 HUD Button — sci-fi styled button with chamfered left edge.
 * ALL variants have the same chamfered clip-path.
 * Standard button for V2 — use everywhere.
 */

const CHAMFER = 8;
const CLIP = `polygon(${CHAMFER}px 0, 100% 0, 100% 100%, 0 100%, 0 ${CHAMFER}px)`;

const THEME_COLORS = {
  space: { primary: 'bg-[#5B9BD5] hover:bg-[#6AABE5]', text: 'text-[#0a1628]' },
  ocean: { primary: 'bg-[#2EDBE8] hover:bg-[#4AE5F0]', text: 'text-[#041225]' },
  default: { primary: 'bg-amber-500 hover:bg-amber-400', text: 'text-white' }
};

const HudButton = ({
  children,
  variant = 'primary',
  theme = 'default',
  icon,
  showArrow = false,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  fullWidth = false,
  glitch = false
}) => {
  const themeColors = THEME_COLORS[theme] || THEME_COLORS.default;

  const variants = {
    primary: {
      bg: themeColors.primary,
      text: themeColors.text,
      shadow: ''
    },
    secondary: {
      bg: 'bg-[#0d1520] hover:bg-[#131d2a]',
      text: 'text-hud-dim hover:text-hud-text',
      shadow: 'shadow-[inset_0_0_0_1px_rgba(46,219,232,0.12)]'
    },
    ghost: {
      bg: 'bg-[#0a0f1a]/60 hover:bg-[#0d1520]',
      text: 'text-hud-dim hover:text-hud-accent',
      shadow: 'shadow-[inset_0_0_0_1px_rgba(46,219,232,0.15)]'
    }
  };

  const v = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${v.bg} ${v.text} ${v.shadow}
        ${fullWidth ? 'w-full' : ''}
        font-mono font-bold tracking-[0.12em] text-[11px]
        px-6 py-2.5
        transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        inline-flex items-center justify-center gap-2
        ${glitch ? 'hud-glitch-error' : ''}
        ${className}
      `}
      style={{ clipPath: CLIP }}
    >
      {showArrow && <FiChevronRight size={12} strokeWidth={3} />}
      {icon && <span className="flex items-center opacity-80">{icon}</span>}
      {children}
    </button>
  );
};

HudButton.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost']),
  theme: PropTypes.oneOf(['space', 'ocean', 'default']),
  icon: PropTypes.node,
  showArrow: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  fullWidth: PropTypes.bool
};

export default HudButton;
