import React from 'react';

import './hudInput.css';

/**
 * HudInput — the standard V2 HUD text field.
 *
 * A translucent, cyan-hairline input with an optional leading icon and trailing
 * suffix (e.g. a show/hide-password toggle). Use this everywhere instead of a
 * raw `<input>` — auth forms, settings, filters, search.
 *
 * Validation is intentionally SUBTLE: pass `error` (a string message or `true`)
 * and the hairline softens to red with a tiny hint below — no loud glitch. The
 * aggressive glitch treatment is reserved for a server-rejected action (see the
 * HudButton `glitch` prop / GlitchHex), not for inline field validation.
 *
 * Usage:
 *   <HudInput icon={<FiMail size={14} />} type="email" placeholder="Email"
 *             value={email} onChange={e => setEmail(e.target.value)}
 *             error={emailError} />
 *
 * Props:
 *   icon      — leading node (react-icons)
 *   suffix    — trailing node (toggle button, unit, etc.)
 *   error     — string (shown as a hint) or boolean (border only)
 *   className — extra classes on the wrapper
 *   ...rest   — forwarded to the native <input> (type, value, onChange, …)
 */
export default function HudInput({
  icon,
  suffix,
  error,
  className = '',
  ...inputProps
}) {
  const hasError = Boolean(error);
  return (
    <div>
      <div
        className={`flex items-center gap-3 px-4 py-1.5 bg-hud-surface/30 border transition ${
          hasError
            ? 'border-red-400/40 focus-within:border-red-400/60'
            : 'border-hud-line/[0.06] focus-within:border-hud-line/20'
        } ${className}`}
      >
        {icon && (
          <span
            className={`flex-shrink-0 ${
              hasError ? 'text-red-400/50' : 'text-hud-dim'
            }`}
          >
            {icon}
          </span>
        )}
        <input
          {...inputProps}
          aria-invalid={hasError || undefined}
          className="hud-input-field flex-1 bg-transparent border-none text-[12px] font-mono text-hud-text placeholder-gray-700"
        />
        {suffix && <span className="flex-shrink-0">{suffix}</span>}
      </div>
      {typeof error === 'string' && error && (
        <p className="mt-1 flex items-center gap-1.5 text-[8px] font-mono text-red-400/70 uppercase tracking-[0.18em]">
          <span className="text-red-400/80 animate-pulse">⟠</span>
          {error}
        </p>
      )}
    </div>
  );
}
