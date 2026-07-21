import React, { useMemo, useState } from 'react';

import HudTabs from '../../../components/V2/HudTabs';
import ProfileSection from './sections/ProfileSection';
import SecuritySection from './sections/SecuritySection';
import SessionsSection from './sections/SessionsSection';
import NotificationsSection from './sections/NotificationsSection';
import AuditSection from './sections/AuditSection';
import MembersSection from './sections/MembersSection';
import IntegrationsSection from './sections/IntegrationsSection';
import BillingSection from './sections/BillingSection';

/**
 * SettingsPanel — the Settings surface as HUD panel CONTENT (rendered inside the
 * CommandCenterV2Page `activePanel` drawer, NOT a route). Single-screen HUD:
 * settings float over the command center, they never navigate away from it.
 *
 * Two-axis IA: a top-level GROUP selector (Personal vs Workspace) + the
 * sections within that group. Personal = things about YOU (profile, security,
 * sessions). Workspace = things about the ORG you operate (members/permissions,
 * audit) — gated server-side to admins.
 */
const GROUPS = [
  {
    id: 'personal',
    label: 'PERSONAL',
    sections: [
      { id: 'profile', label: 'PROFILE', Component: ProfileSection },
      { id: 'security', label: 'SECURITY', Component: SecuritySection },
      { id: 'sessions', label: 'SESSIONS', Component: SessionsSection },
      {
        id: 'notifications',
        label: 'NOTIFICATIONS',
        Component: NotificationsSection
      }
    ]
  },
  {
    id: 'workspace',
    label: 'WORKSPACE',
    sections: [
      { id: 'members', label: 'MEMBERS', Component: MembersSection },
      { id: 'integrations', label: 'INTEGRATIONS', Component: IntegrationsSection },
      { id: 'billing', label: 'BILLING', Component: BillingSection },
      { id: 'audit', label: 'AUDIT', Component: AuditSection }
    ]
  }
];

const ALL_SECTIONS = GROUPS.flatMap((g) =>
  g.sections.map((s) => ({ ...s, groupId: g.id }))
);

export default function SettingsPanel({ initialSection = 'profile' }) {
  const initial =
    ALL_SECTIONS.find((s) => s.id === initialSection) || ALL_SECTIONS[0];

  const [groupId, setGroupId] = useState(initial.groupId);
  const [sectionId, setSectionId] = useState(initial.id);

  const group = useMemo(
    () => GROUPS.find((g) => g.id === groupId) || GROUPS[0],
    [groupId]
  );
  const section = useMemo(
    () =>
      group.sections.find((s) => s.id === sectionId) || group.sections[0],
    [group, sectionId]
  );
  const ActiveSection = section.Component;

  const onGroupChange = (nextGroupId) => {
    setGroupId(nextGroupId);
    const g = GROUPS.find((x) => x.id === nextGroupId) || GROUPS[0];
    setSectionId(g.sections[0].id);
  };

  return (
    <div className="flex flex-col">
      {/* Group axis: Personal vs Workspace */}
      <HudTabs
        className="mb-3"
        activeId={groupId}
        onChange={onGroupChange}
        tabs={GROUPS.map((g) => ({ id: g.id, label: g.label }))}
        fill
      />
      {/* Section axis within the group */}
      <HudTabs
        className="mb-5"
        activeId={sectionId}
        onChange={setSectionId}
        tabs={group.sections.map((s) => ({ id: s.id, label: s.label }))}
        fill={false}
      />
      <ActiveSection />
    </div>
  );
}
