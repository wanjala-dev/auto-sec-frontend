import React from 'react';

import HudText from './HudText';

/**
 * HudStepper — reusable V2 HUD multi-step progress indicator.
 *
 * A row of numbered/checked nodes joined by a track, plus a "STEP X / N" label,
 * for any linear flow (onboarding, a wizard, a multi-part setup). Nodes are
 * `complete` (✓, cyan-filled), `active` (number, glowing ring), or `pending`
 * (number, dim). Use this instead of hand-rolling a step bar.
 *
 * Usage:
 *   <HudStepper
 *     steps={[{ label: 'Establish Workspace' }, { label: 'Command Center' }]}
 *     current={0}
 *   />
 *
 * Props:
 *   steps   — [{ label: string }]
 *   current — 0-based index of the active step (earlier steps render complete)
 *   className
 */
export default function HudStepper({ steps = [], current = 0, className = '' }) {
  const total = steps.length;
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <HudText variant="label" color="cyan-muted">
          STEP {Math.min(current + 1, total)} / {total}
        </HudText>
        <HudText variant="tiny" color="dim">
          {steps[current]?.label?.toUpperCase()}
        </HudText>
      </div>
      <div className="flex items-center">
        {steps.map((step, i) => {
          const complete = i < current;
          const active = i === current;
          return (
            <React.Fragment key={step.label ?? i}>
              <div className="flex flex-col items-center">
                <div
                  className={`h-6 w-6 flex items-center justify-center text-[10px] font-mono font-bold border transition ${
                    complete
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : active
                      ? 'bg-cyan-500/10 border-cyan-400/60 text-cyan-300 shadow-[0_0_10px_rgba(46,219,232,0.35)]'
                      : 'bg-black/30 border-cyan-500/15 text-gray-600'
                  }`}
                  style={{
                    clipPath:
                      'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 0 100%)'
                  }}
                >
                  {complete ? '✓' : i + 1}
                </div>
              </div>
              {i < total - 1 && (
                <div
                  className={`flex-1 h-px mx-2 ${
                    i < current ? 'bg-cyan-500/40' : 'bg-cyan-500/10'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
