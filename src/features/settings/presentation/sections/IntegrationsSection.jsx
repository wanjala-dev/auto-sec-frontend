import React, { useCallback, useEffect, useState } from 'react';
import { FiCloud, FiPlus, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HudCard from '../../../../components/V2/HudCard';
import HudButton from '../../../../components/V2/HudButton';
import HudInput from '../../../../components/V2/HudInput';
import HudCheckbox from '../../../../components/V2/HudCheckbox';
import HexLoader from '../../../../components/V2/HexLoader';
import RestrictedArea from '../../../../components/V2/RestrictedArea';
import apiClient from '../../../../infrastructure/http/apiClient';
import { useSeedContext } from '../../../seed/presentation/SeedContext';
import { resolveStoredSummaryWorkspaceId } from '../../../../domain/auth/storedSummarySelectors';
import { readViewerStoredUserSummary } from '../../../auth/presentation/browserAuthSessionSupport';

const STATUS_C = {
  pending: '#F59E0B',
  verifying: '#2EDBE8',
  connected: '#34d399',
  degraded: '#F59E0B',
  error: '#E84D8A',
  disabled: '#64748b'
};

/**
 * IntegrationsSection — Settings ▸ Workspace ▸ Integrations.
 * AWS onboarding: connect an account or a whole AWS Organization (vendor
 * ExternalId + CloudFormation StackSet / Terraform), view the generated
 * template, and trigger verification.
 */
export default function IntegrationsSection() {
  const { seed } = useSeedContext();
  const workspaceId =
    seed?.id ||
    seed?.pk ||
    resolveStoredSummaryWorkspaceId(readViewerStoredUserSummary()) ||
    null;

  const [conns, setConns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acct, setAcct] = useState('');
  const [orgWide, setOrgWide] = useState(true);
  const [creating, setCreating] = useState(false);
  const [template, setTemplate] = useState(null); // {format, text}

  const load = useCallback(async () => {
    if (!workspaceId) return setLoading(false);
    setLoading(true);
    try {
      const r = await apiClient.get(`/integrations/workspaces/${workspaceId}/aws/`);
      setConns(r?.data?.data || []);
    } catch {
      setConns([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async () => {
    const clean = acct.trim();
    if (!/^\d{12}$/.test(clean)) {
      toast.error('Enter a 12-digit AWS account id', { icon: '⚠️' });
      return;
    }
    setCreating(true);
    try {
      await apiClient.post(`/integrations/workspaces/${workspaceId}/aws/`, {
        management_account_id: clean,
        org_wide: orgWide
      });
      setAcct('');
      await load();
      toast.success('Connection created — deploy the template to finish', { icon: '☁️' });
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Unable to create connection', { icon: '⚠️' });
    } finally {
      setCreating(false);
    }
  }, [acct, orgWide, workspaceId, load]);

  const fetchTemplate = useCallback(
    async (id, fmt) => {
      try {
        const r = await apiClient.get(
          `/integrations/workspaces/${workspaceId}/aws/${id}/cloudformation/${fmt === 'terraform' ? '?fmt=terraform' : ''}`
        );
        const data = r?.data?.data;
        setTemplate({
          format: fmt,
          text: fmt === 'terraform' ? data : JSON.stringify(data, null, 2)
        });
      } catch {
        toast.error('Unable to fetch template', { icon: '⚠️' });
      }
    },
    [workspaceId]
  );

  if (!workspaceId)
    return <RestrictedArea variant="info" title="INTEGRATIONS" subtitle="NO WORKSPACE" />;

  return (
    <div className="flex flex-col gap-4">
      {/* Connect form */}
      <HudCard chamfer={10} border="cyan" surface="bg-hud-surface/60" bodyClassName="p-3">
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-hud-dim">
          <FiCloud size={11} /> CONNECT AWS
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <HudInput
              placeholder="AWS account id (12 digits)"
              value={acct}
              onChange={(e) => setAcct(e.target.value)}
              className="px-2 py-1"
            />
          </div>
          <label className="flex items-center gap-1.5 font-mono text-[9px] text-hud-dim">
            <HudCheckbox checked={orgWide} onChange={setOrgWide} size={14} />
            Entire AWS Organization
          </label>
          <HudButton
            variant="primary"
            icon={<FiPlus size={12} />}
            disabled={creating}
            onClick={create}
          >
            Connect
          </HudButton>
        </div>
        <p className="mt-2 font-mono text-[8px] leading-relaxed text-hud-dim">
          We generate a unique External ID and a CloudFormation / Terraform template. Org-wide
          uses a service-managed StackSet with auto-deployment — future member accounts are
          covered automatically. Read-only role; no keys ever stored.
        </p>
      </HudCard>

      {/* Connections */}
      {loading ? (
        <div className="flex justify-center py-6">
          <HexLoader size={40} />
        </div>
      ) : conns.length === 0 ? (
        <RestrictedArea variant="info" title="NO AWS CONNECTIONS" subtitle="CONNECT ONE ABOVE" />
      ) : (
        conns.map((c) => (
          <HudCard key={c.id} chamfer={10} border="cyan" surface="bg-hud-surface/50" bodyClassName="p-3">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[11px] text-hud-text">
                  {c.name} · {c.management_account_id}
                  {c.org_wide ? ' · ORG-WIDE' : ''}
                </span>
                <span className="block truncate font-mono text-[8px] text-hud-dim">
                  external id: {c.external_id}
                </span>
              </span>
              <span
                className="border px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-wider"
                style={{
                  color: STATUS_C[c.status] || '#64748b',
                  borderColor: `${STATUS_C[c.status] || '#64748b'}44`
                }}
              >
                {(c.status || '').toUpperCase()}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => fetchTemplate(c.id, 'cloudformation')}
                className="border border-hud-line/25 px-2 py-1 font-mono text-[9px] text-hud-accent hover:border-hud-accent/50"
              >
                CLOUDFORMATION
              </button>
              <button
                type="button"
                onClick={() => fetchTemplate(c.id, 'terraform')}
                className="border border-hud-line/25 px-2 py-1 font-mono text-[9px] text-hud-accent hover:border-hud-accent/50"
              >
                TERRAFORM
              </button>
              {c.accounts?.length > 0 && (
                <span className="ml-auto flex items-center gap-1 font-mono text-[8px] text-hud-dim">
                  <FiCheckCircle size={10} /> {c.accounts.length} accounts
                </span>
              )}
            </div>
          </HudCard>
        ))
      )}

      {/* Template viewer */}
      {template && (
        <HudCard chamfer={10} border="cyan" surface="bg-hud-surface/70" bodyClassName="p-3">
          <p className="mb-1.5 font-mono text-[8px] tracking-wider text-hud-dim">
            {template.format.toUpperCase()} TEMPLATE — deploy in the customer management account
          </p>
          <pre className="max-h-64 overflow-auto cc-scrollbar whitespace-pre-wrap font-mono text-[9px] leading-snug text-hud-text">
            {template.text}
          </pre>
        </HudCard>
      )}
    </div>
  );
}
