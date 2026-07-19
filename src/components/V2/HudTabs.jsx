import React from 'react';

/**
 * HudTabs — reusable V2 HUD segmented tab strip.
 *
 * A row of equal-width chamfer-less segments with the active one highlighted in
 * cyan. Use anywhere a surface switches between mutually-exclusive modes/views
 * (auth login/register/reset, a panel's sub-tabs, filter segments) instead of
 * hand-rolling a `<button>` strip.
 *
 * Usage:
 *   <HudTabs
 *     tabs={[{ id: 'login', label: 'SIGN IN' }, { id: 'register', label: 'REGISTER' }]}
 *     activeId={mode}
 *     onChange={setMode}
 *   />
 *
 * Props:
 *   tabs      — [{ id: string, label: string, disabled?: boolean }]
 *   activeId  — id of the active tab
 *   onChange  — (id) => void
 *   size      — 'sm' | 'md' (default 'sm') — controls font size/padding
 *   fill      — stretch tabs to equal width (default true)
 *   className — extra classes on the wrapper
 */
const SIZES = {
  sm: 'px-4 py-1.5 text-[9px] tracking-[0.15em]',
  md: 'px-5 py-2 text-[10px] tracking-[0.18em]'
};

export default function HudTabs({
  tabs = [],
  activeId,
  onChange,
  size = 'sm',
  fill = true,
  className = ''
}) {
  const sizeClass = SIZES[size] || SIZES.sm;
  return (
    <div className={`flex gap-2 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange?.(tab.id)}
            className={`${fill ? 'flex-1' : ''} ${sizeClass} font-mono border transition ${
              active
                ? 'border-hud-line/30 bg-cyan-500/10 text-hud-accent'
                : 'border-transparent text-hud-dim hover:text-hud-dim'
            } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
