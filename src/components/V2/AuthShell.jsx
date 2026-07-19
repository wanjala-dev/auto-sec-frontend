import React from 'react';

import StarField from './StarField';
import GlitchHex from './GlitchHex';
import HudCard from './HudCard';
import HudText from './HudText';

/**
 * AuthShell — the shared V2 HUD frame for full-screen auth surfaces (login,
 * onboarding, reset-confirm, email-confirm, success screens). Starfield
 * backdrop + the "eye" hexagon (glitch-pulses cyan while busy, red on error) +
 * a title/subtitle + a chamfered HudCard body.
 *
 * Reuse this instead of re-pasting the starfield/eye/card boilerplate on every
 * auth page.
 *
 * Props:
 *   title, subtitle — heading text (subtitle optional)
 *   status  — 'idle' | 'busy' | 'error' (drives the eye color/animation)
 *   footer  — optional node rendered under the card (links, sign-out)
 *   children — card body
 */
export default function AuthShell({
  title,
  subtitle,
  status = 'idle',
  footer,
  children
}) {
  const error = status === 'error';
  const busy = status === 'busy';
  return (
    <div className="fixed inset-0 bg-[#050814] overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0">
        <StarField count={200} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-24 w-24 mb-4 flex items-center justify-center">
            <GlitchHex
              size={96}
              color={error ? '#ff3b52' : '#2EDBE8'}
              active={busy || error}
            />
            <span
              className={`absolute text-[30px] ${
                error ? 'text-red-400' : 'text-cyan-400'
              }`}
            >
              ◉
            </span>
          </div>
          <HudText
            variant="title"
            color={error ? 'red' : 'cyan'}
            className="tracking-[0.24em] text-center"
          >
            {title}
          </HudText>
          {subtitle && (
            <HudText
              variant="caption"
              color="cyan-muted"
              className="mt-1 tracking-[0.22em] text-center"
            >
              {subtitle}
            </HudText>
          )}
        </div>

        <HudCard surface="bg-black/50 backdrop-blur-xl" bodyClassName="p-8">
          {children}
        </HudCard>

        {footer && <div className="text-center mt-6">{footer}</div>}
      </div>
    </div>
  );
}
