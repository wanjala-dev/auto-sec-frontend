import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiMail, FiSend, FiShield, FiUsers } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HudCard from '../../../../components/V2/HudCard';
import HudButton from '../../../../components/V2/HudButton';
import HudText from '../../../../components/V2/HudText';
import HudInput from '../../../../components/V2/HudInput';
import HudSelect from '../../../../components/V2/HudSelect';
import HudCheckbox from '../../../../components/V2/HudCheckbox';
import HudTabs from '../../../../components/V2/HudTabs';
import HexLoader from '../../../../components/V2/HexLoader';
import RestrictedArea from '../../../../components/V2/RestrictedArea';
import { useSeedContext } from '../../../seed/presentation/SeedContext';
import { listTeamInvitations } from '../../../team/application/teamService';
import { membersAdminApi } from '../../infrastructure/membersAdminApi';
import { toLinuxRoleLabel } from '../../../../domain/identity/roleDisplay';
import { resolveStoredSummaryWorkspaceId } from '../../../../domain/auth/storedSummarySelectors';
import { readViewerStoredUserSummary } from '../../../auth/presentation/browserAuthSessionSupport';

/* ── Security capability catalog (mirrors backend VALID_PERMISSION_KEYS,
   grouped for the matrix). ── */
const PERMISSION_GROUPS = [
  {
    group: 'Platform',
    keys: [
      ['manage_settings', 'Settings'],
      ['manage_billing', 'Billing'],
      ['manage_integrations', 'Integrations'],
      ['manage_users', 'Users'],
      ['manage_permissions', 'Permissions']
    ]
  },
  {
    group: 'Findings',
    keys: [
      ['view_findings', 'View'],
      ['manage_findings', 'Manage']
    ]
  },
  {
    group: 'Detections',
    keys: [
      ['view_detections', 'View'],
      ['manage_detections', 'Manage']
    ]
  },
  {
    group: 'Cases',
    keys: [
      ['view_cases', 'View'],
      ['manage_cases', 'Manage']
    ]
  },
  {
    group: 'Playbooks',
    keys: [
      ['run_playbooks', 'Run'],
      ['manage_playbooks', 'Manage']
    ]
  },
  {
    group: 'Agents',
    keys: [
      ['view_agents', 'View'],
      ['manage_agents', 'Manage']
    ]
  },
  {
    group: 'Assets',
    keys: [
      ['view_assets', 'View'],
      ['manage_assets', 'Manage']
    ]
  },
  {
    group: 'Audit & Reports',
    keys: [
      ['view_audit', 'Audit'],
      ['view_reports', 'Reports'],
      ['manage_reports', 'Manage rpt']
    ]
  },
  {
    group: 'Writing',
    keys: [
      ['view_writing', 'View'],
      ['manage_writing', 'Author']
    ]
  }
];

// Role is structural for owners; admins can be demoted/promoted between these.
const ROLE_OPTIONS = [
  { value: 'admin', label: 'root' }, // admin surfaces as root
  { value: 'member', label: 'member' },
  { value: 'viewer', label: 'viewer' }
];

const initials = (name, email) => {
  const src = (name || email || '?').trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  const two = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return (two || src[0] || '?').toUpperCase();
};

const STATUS_STYLE = {
  active: { c: '#34d399', t: 'ACTIVE' },
  invited: { c: '#F59E0B', t: 'INVITED' },
  suspended: { c: '#E84D8A', t: 'SUSPENDED' }
};

/**
 * MembersSection — Settings ▸ Workspace ▸ Members. Lists members with their
 * role (admin surfaces as "root"), edits roles, edits per-member DIRECT
 * permission grants via a matrix, and invites new members. Driven by the
 * workspace-scoped admin endpoints (effective-permissions + member-role +
 * permissions/bulk) and the membership invitation routes.
 */
export default function MembersSection() {
  const { seed } = useSeedContext();
  const workspaceId =
    seed?.id ||
    seed?.pk ||
    resolveStoredSummaryWorkspaceId(readViewerStoredUserSummary()) ||
    null;

  const [tab, setTab] = useState('members');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [savingKey, setSavingKey] = useState(null); // `${userId}:${permKey}` in flight

  const load = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [permsRes, invitesRes] = await Promise.all([
        membersAdminApi.effectivePermissions(workspaceId),
        listTeamInvitations(workspaceId).catch(() => ({ results: [] }))
      ]);
      // The effective-permissions endpoint wraps rows as { "members": [...] }.
      const rows =
        permsRes?.data?.members ||
        permsRes?.data?.results ||
        permsRes?.data?.data ||
        (Array.isArray(permsRes?.data) ? permsRes.data : []);
      setMembers(Array.isArray(rows) ? rows : []);
      setInvites(
        Array.isArray(invitesRes?.results) ? invitesRes.results : []
      );
    } catch (e) {
      setError(
        e?.response?.data?.message || 'Unable to load members. Admin access required.'
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = useCallback(
    async (userId, role) => {
      try {
        await membersAdminApi.updateMemberRole(workspaceId, userId, role);
        toast.success('Role updated', { icon: '✅' });
        setMembers((prev) =>
          prev.map((m) =>
            String(m.user_id) === String(userId)
              ? { ...m, role_slug: role }
              : m
          )
        );
      } catch (e) {
        toast.error(e?.response?.data?.message || 'Unable to update role', {
          icon: '⚠️'
        });
      }
    },
    [workspaceId]
  );

  const permSet = (m) =>
    new Set([
      ...(m.role_permissions || []),
      ...(m.direct_permissions || []),
      ...(m.group_permissions || [])
    ]);

  const togglePermission = useCallback(
    async (member, permKey, nextChecked) => {
      const cellKey = `${member.user_id}:${permKey}`;
      setSavingKey(cellKey);
      try {
        await membersAdminApi.bulkPermissions(workspaceId, {
          action: nextChecked ? 'grant' : 'revoke',
          permission_keys: [permKey],
          user_ids: [member.user_id]
        });
        setMembers((prev) =>
          prev.map((m) => {
            if (String(m.user_id) !== String(member.user_id)) return m;
            const direct = new Set(m.direct_permissions || []);
            if (nextChecked) direct.add(permKey);
            else direct.delete(permKey);
            return { ...m, direct_permissions: Array.from(direct) };
          })
        );
      } catch (e) {
        toast.error(e?.response?.data?.message || 'Unable to update permission', {
          icon: '⚠️'
        });
      } finally {
        setSavingKey(null);
      }
    },
    [workspaceId]
  );

  if (!workspaceId) {
    return (
      <RestrictedArea
        variant="info"
        title="MEMBERS"
        subtitle="NO WORKSPACE SELECTED"
        message="Select a workspace to manage its members."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <HexLoader size={56} />
        <HudText variant="caption" color="cyan-muted">
          LOADING MEMBERS…
        </HudText>
      </div>
    );
  }

  if (error) {
    return (
      <RestrictedArea variant="error" title="MEMBERS" subtitle={error} />
    );
  }

  return (
    <div className="flex flex-col">
      <HudTabs
        className="mb-4"
        activeId={tab}
        onChange={setTab}
        fill={false}
        tabs={[
          { id: 'members', label: `MEMBERS (${members.length})` },
          { id: 'permissions', label: 'PERMISSIONS' },
          { id: 'invites', label: `INVITES (${invites.length})` }
        ]}
      />

      {tab === 'members' && (
        <MemberList members={members} onChangeRole={changeRole} />
      )}
      {tab === 'permissions' && (
        <PermissionMatrix
          members={members}
          savingKey={savingKey}
          onToggle={togglePermission}
          permSet={permSet}
        />
      )}
      {tab === 'invites' && (
        <InvitesTab
          workspaceId={workspaceId}
          invites={invites}
          onInvited={load}
        />
      )}
    </div>
  );
}

/* ── Members list — role editable via HudSelect (admin surfaces as root). ── */
function MemberList({ members, onChangeRole }) {
  if (members.length === 0) {
    return (
      <RestrictedArea variant="info" title="NO MEMBERS" subtitle="—" />
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {members.map((m) => {
        const status = STATUS_STYLE[m.membership_status] || STATUS_STYLE.active;
        return (
          <HudCard
            key={m.user_id}
            chamfer={10}
            border="cyan"
            surface="bg-hud-surface/60"
            bodyClassName="flex items-center gap-3 px-3 py-2"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-hud-line/30 bg-hud-surface-2 font-mono text-[10px] font-bold text-hud-accent">
              {initials(m.name, m.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[12px] text-hud-text">
                {m.name || m.email}
              </p>
              <p className="truncate font-mono text-[9px] text-hud-dim">
                {m.email}
              </p>
            </div>
            <span
              className="flex-shrink-0 border px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-wider"
              style={{
                color: status.c,
                borderColor: `${status.c}44`,
                background: `${status.c}11`
              }}
            >
              {status.t}
            </span>
            {m.is_owner ? (
              <span className="flex-shrink-0 border border-hud-accent/40 bg-cyan-500/10 px-2 py-1 font-mono text-[9px] font-bold tracking-wider text-hud-accent">
                OWNER
              </span>
            ) : (
              <HudSelect
                className="flex-shrink-0"
                value={m.role_slug || 'member'}
                onChange={(v) => onChangeRole(m.user_id, v)}
                options={ROLE_OPTIONS}
              />
            )}
          </HudCard>
        );
      })}
    </div>
  );
}

/* ── Permission matrix — rows = members, cols = capabilities. Owners are
   all-on (disabled). Role/group-inherited cells are checked + locked; direct
   grants are the editable layer. ── */
function PermissionMatrix({ members, savingKey, onToggle, permSet }) {
  const editable = members.filter((m) => !m.is_owner);
  if (editable.length === 0) {
    return (
      <RestrictedArea
        variant="info"
        title="PERMISSION MATRIX"
        subtitle="ONLY OWNERS PRESENT"
        message="Owners hold every capability. Invite members to assign granular permissions."
      />
    );
  }
  return (
    <div className="overflow-x-auto cc-scrollbar">
      <table className="w-full border-collapse font-mono">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-hud-surface px-2 py-2 text-left text-[8px] tracking-wider text-hud-dim">
              MEMBER
            </th>
            {PERMISSION_GROUPS.map((g) =>
              g.keys.map(([key, short]) => (
                <th
                  key={key}
                  title={key}
                  className="px-1.5 py-2 text-center text-[7px] tracking-wide text-hud-dim"
                >
                  <span className="block text-hud-accent">{g.group[0]}</span>
                  {short}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {editable.map((m) => {
            const has = permSet(m);
            const direct = new Set(m.direct_permissions || []);
            return (
              <tr key={m.user_id} className="border-t border-hud-line/10">
                <td className="sticky left-0 z-10 max-w-[120px] truncate bg-hud-surface px-2 py-1.5 text-left text-[10px] text-hud-text">
                  {m.name || m.email}
                </td>
                {PERMISSION_GROUPS.map((g) =>
                  g.keys.map(([key]) => {
                    const checked = has.has(key);
                    const isDirect = direct.has(key);
                    const inherited = checked && !isDirect; // role/group
                    const cellKey = `${m.user_id}:${key}`;
                    const saving = savingKey === cellKey;
                    return (
                      <td key={key} className="px-1.5 py-1.5 text-center">
                        <HudCheckbox
                          checked={checked}
                          disabled={inherited || saving}
                          size={15}
                          title={
                            inherited
                              ? 'Granted by role/group'
                              : isDirect
                              ? 'Direct grant — click to revoke'
                              : 'Click to grant'
                          }
                          onChange={(next) => onToggle(m, key, next)}
                        />
                      </td>
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 flex items-center gap-2 font-mono text-[8px] text-hud-dim">
        <FiShield size={10} className="text-hud-dim" />
        Faded = inherited from role/group (locked). Solid = editable direct
        grant. Owners hold all capabilities.
      </p>
    </div>
  );
}

/* ── Invites — pending list + invite-by-email form. ── */
function InvitesTab({ workspaceId, invites, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [sending, setSending] = useState(false);

  const submit = useCallback(async () => {
    const clean = email.trim();
    if (!clean) return;
    setSending(true);
    try {
      await membersAdminApi.invite(workspaceId, { email: clean, role });
      toast.success(`Invite sent to ${clean}`, { icon: '📨' });
      setEmail('');
      await onInvited();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Unable to send invite', {
        icon: '⚠️'
      });
    } finally {
      setSending(false);
    }
  }, [email, role, workspaceId, onInvited]);

  return (
    <div className="flex flex-col gap-4">
      <HudCard
        chamfer={10}
        border="cyan"
        surface="bg-hud-surface/60"
        bodyClassName="p-3"
      >
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-hud-dim">
          <FiUsers size={11} /> INVITE OPERATOR
        </p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <HudInput
              icon={<FiMail size={13} />}
              type="email"
              placeholder="operator@org.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
          </div>
          <HudSelect
            label="Role"
            value={role}
            onChange={setRole}
            options={ROLE_OPTIONS}
          />
          <HudButton
            variant="primary"
            icon={<FiSend size={12} />}
            disabled={sending || !email.trim()}
            onClick={submit}
          >
            {sending ? 'Sending…' : 'Invite'}
          </HudButton>
        </div>
      </HudCard>

      <div>
        <p className="mb-2 font-mono text-[9px] tracking-wider text-hud-dim">
          PENDING INVITES
        </p>
        {invites.length === 0 ? (
          <RestrictedArea variant="info" title="NO PENDING INVITES" subtitle="—" />
        ) : (
          <div className="flex flex-col gap-1.5">
            {invites.map((inv, i) => (
              <HudCard
                key={inv.email || i}
                chamfer={8}
                border="cyan"
                surface="bg-hud-surface/50"
                bodyClassName="flex items-center gap-3 px-3 py-2"
              >
                <FiMail size={12} className="flex-shrink-0 text-amber-400/60" />
                <span className="flex-1 truncate font-mono text-[11px] text-hud-text">
                  {inv.email}
                </span>
                {inv.latest_sent && (
                  <span className="flex-shrink-0 font-mono text-[8px] text-hud-dim">
                    {new Date(inv.latest_sent).toLocaleDateString()}
                  </span>
                )}
                <span className="flex-shrink-0 border border-amber-500/30 bg-amber-500/[0.06] px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-wider text-amber-400">
                  PENDING
                </span>
              </HudCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
