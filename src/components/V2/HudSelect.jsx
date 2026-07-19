import React from 'react';
import PropTypes from 'prop-types';
import { FiChevronDown } from 'react-icons/fi';

/**
 * HudSelect — the HUD design-system dropdown. The select counterpart to the
 * underline text inputs: no box, just a single bottom line, transparent
 * background, cyan underline that brightens on hover/focus. Mirrors the
 * literacyseed `UnderlineSelect` look, restyled for the neon HUD palette.
 *
 * `onChange` receives the selected VALUE (not the event), matching the rest of
 * the HUD form controls.
 *
 * Props:
 *   value          — current value (string)
 *   onChange(value)— called with the selected value
 *   options        — [{ value, label, disabled? }]
 *   label          — optional inline caption rendered before the control
 *   placeholder    — optional disabled first option
 *   name, disabled, className, selectClassName, aria-label
 */
export default function HudSelect({
  value,
  onChange,
  options = [],
  label,
  placeholder,
  name,
  disabled = false,
  className = '',
  selectClassName = '',
  'aria-label': ariaLabel
}) {
  return (
    <label className={`flex items-center gap-1.5 ${className}`.trim()}>
      {label ? (
        <span className="shrink-0 font-mono text-[7px] uppercase tracking-[0.18em] text-hud-dim">
          {label}
        </span>
      ) : null}
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value ?? ''}
          disabled={disabled}
          aria-label={ariaLabel || label}
          onChange={(event) => onChange(event.target.value)}
          className={`peer block w-full cursor-pointer appearance-none border-0 border-b border-hud-line/25 bg-transparent bg-none py-1 pl-0.5 pr-6 text-left font-mono text-[10px] tracking-wide text-hud-accent outline-none transition-colors hover:border-hud-accent/50 focus:border-hud-accent focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 ${selectClassName}`.trim()}
        >
          {placeholder ? (
            <option value="" disabled className="bg-hud-surface text-hud-accent">
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="bg-hud-surface text-cyan-200"
            >
              {option.label}
            </option>
          ))}
        </select>
        <FiChevronDown
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-hud-dim transition-colors peer-focus:text-hud-accent"
          size={12}
        />
      </div>
    </label>
  );
}

HudSelect.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      label: PropTypes.node.isRequired,
      disabled: PropTypes.bool
    })
  ).isRequired,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  name: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  selectClassName: PropTypes.string,
  'aria-label': PropTypes.string
};
