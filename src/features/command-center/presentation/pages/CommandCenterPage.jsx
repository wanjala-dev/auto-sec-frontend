import React from 'react';

import HudButton from '../../../../components/V2/HudButton';
import HudPanel from '../../../../components/V2/HudPanel';
import HudText from '../../../../components/V2/HudText';
import StarField from '../../../../components/V2/StarField';

/**
 * Auto-Sec — V2 HUD Command Center (scaffold shell).
 *
 * Composes the reusable V2 primitives (StarField, HudPanel, HudButton,
 * HudText) copied verbatim from literacyseed into a security-domain shell.
 * This is intentionally backend-agnostic: it renders the aesthetic and the
 * product framing (alert triage / agent arm) with static placeholder data.
 * Live data, the agent arm, and auth are wired in later slices.
 */

const ALERTS = [
  { id: 'SEC-4471', src: 'CloudWatch', sev: 'critical', msg: '5xx spike — api-gateway (12.4%)', color: 'red' },
  { id: 'SEC-4470', src: 'Sentry', sev: 'high', msg: 'Unhandled exception surge — auth-svc', color: 'amber' },
  { id: 'SEC-4468', src: 'Slack #alerts', sev: 'medium', msg: 'Latency p95 > 800ms — checkout', color: 'purple' },
];

const AGENTS = [
  { name: 'TRIAGE ORCHESTRATOR', state: 'IDLE', color: 'cyan' },
  { name: 'LOG-INTEL SPECIALIST', state: 'READY', color: 'emerald' },
  { name: 'GIT INSPECTOR', state: 'READY', color: 'emerald' },
  { name: 'RECON / ENUM ARM', state: 'OFFLINE', color: 'muted' },
];

const SevDot = ({ color }) => (
  <span className={`inline-block w-1.5 h-1.5 rounded-full bg-${color}-400 mr-2 align-middle`} />
);

export default function CommandCenterPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050814] text-gray-200 font-mono">
      {/* Ambient starfield backdrop */}
      <StarField count={160} />

      {/* subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 600px at 50% -10%, rgba(46,219,232,0.10), transparent 60%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-cyan-500/15 pb-4">
          <div>
            <HudText variant="title" color="cyan">
              AUTO-SEC
            </HudText>
            <div className="mt-1">
              <HudText variant="heading" color="muted">
                SOC · COMMAND CENTER · v0.1 SCAFFOLD
              </HudText>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HudText variant="label" color="emerald">
              ● SYSTEMS NOMINAL
            </HudText>
            <HudButton variant="secondary" showArrow>
              NEW SWEEP
            </HudButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Alert triage feed */}
          <HudPanel title="ALERT TRIAGE FEED" className="md:col-span-2 min-h-[260px]">
            <div className="mt-2 space-y-3">
              {ALERTS.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between border border-cyan-500/10 bg-black/30 px-3 py-2"
                >
                  <div className="pr-4">
                    <HudText variant="label" color="white">
                      <SevDot color={a.color} />
                      {a.id} · {a.src}
                    </HudText>
                    <div className="mt-1">
                      <HudText variant="body" color="light">
                        {a.msg}
                      </HudText>
                    </div>
                  </div>
                  <HudButton variant="ghost" showArrow>
                    TRIAGE
                  </HudButton>
                </div>
              ))}
            </div>
          </HudPanel>

          {/* Agent arm status */}
          <HudPanel title="AGENT ARM" className="min-h-[260px]">
            <div className="mt-2 space-y-2">
              {AGENTS.map((ag) => (
                <div
                  key={ag.name}
                  className="flex items-center justify-between border-b border-cyan-500/10 py-2"
                >
                  <HudText variant="label" color="light">
                    {ag.name}
                  </HudText>
                  <HudText variant="tiny" color={ag.color}>
                    {ag.state}
                  </HudText>
                </div>
              ))}
            </div>
          </HudPanel>
        </div>

        {/* Footer strip */}
        <div className="mt-6 flex items-center justify-between border-t border-cyan-500/15 pt-4">
          <HudText variant="caption" color="dim">
            AUTO-SEC // AUTHORIZED PERSONNEL ONLY // ALL ACTIVITY AUDITED
          </HudText>
          <HudText variant="caption" color="muted">
            LOCAL · SINGLE-TENANT · NO LIVE DEMO
          </HudText>
        </div>
      </div>
    </div>
  );
}
