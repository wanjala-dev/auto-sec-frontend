/**
 * V2 mission-context chip — HUD-styled sibling of
 * ``src/components/AIProfile/MissionContextChip.jsx``.
 *
 * Per CLAUDE.md V1/V2 separation rule the two are independent
 * components, not a single component with a ``variant`` prop. They
 * share data shape (``useWorkspaceAIProfile``) but render different
 * markup: V2 uses sharp edges, monospace font, and a cyan accent
 * to match the surrounding HUD chrome on ``HudChatPanel``.
 *
 * Plan reference: ``/Users/henrywanjala/.claude/plans/atomic-gathering-fox.md``
 * AI Fluency Wave 1 frontend slice.
 */
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWorkspaceAIProfile } from 'features/ai-chat/presentation/useWorkspaceAIProfile';

const VOICE_LABELS = {
  formal: 'FORMAL',
  warm: 'WARM',
  activist: 'ACTIVIST',
  technical: 'TECHNICAL'
};

function buildTooltip(profile) {
  const lines = [];
  if (profile.voice_tone) {
    lines.push(
      `voice_tone: ${VOICE_LABELS[profile.voice_tone] || profile.voice_tone}`
    );
  }
  if (profile.beneficiary_language_rules) {
    lines.push(`language_rules: ${profile.beneficiary_language_rules}`);
  }
  if (profile.custom_system_prompt_addendum) {
    lines.push(`custom_addendum: ${profile.custom_system_prompt_addendum}`);
  }
  return lines.join('\n');
}

const MissionContextChipV2 = ({ workspaceId, settingsRoute }) => {
  const navigate = useNavigate();
  const { profile, isConfigured, loading } = useWorkspaceAIProfile(workspaceId);

  const tooltip = useMemo(() => buildTooltip(profile), [profile]);

  const handleClick = useCallback(() => {
    if (!settingsRoute) return;
    navigate(settingsRoute);
  }, [navigate, settingsRoute]);

  if (loading || !isConfigured) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      aria-label={`AI profile loaded: ${tooltip}`}
      className="inline-flex items-center gap-1.5 border border-hud-line/30 bg-cyan-500/[0.06] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-hud-accent transition hover:bg-cyan-500/[0.12]"
    >
      <span className="block h-1.5 w-1.5 bg-cyan-400" />
      <span>AI_PROFILE</span>
    </button>
  );
};

export default MissionContextChipV2;
