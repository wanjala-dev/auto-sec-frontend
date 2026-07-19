import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiGrid, FiKey } from 'react-icons/fi';
import { toast } from 'react-toastify';

import GlitchHex from '../../../../components/V2/GlitchHex';
import HudCard from '../../../../components/V2/HudCard';
import HudTabs from '../../../../components/V2/HudTabs';
import HudInput from '../../../../components/V2/HudInput';
import HudButton from '../../../../components/V2/HudButton';
import HudText from '../../../../components/V2/HudText';
import HudStepper from '../../../../components/V2/HudStepper';
import apiClient from '../../../../infrastructure/http/apiClient';
import { useAuthContext } from '../../../auth/presentation/LoginAuthContext';

const MODES = { create: 'CREATE', join: 'JOIN' };

/**
 * OnboardingPage — the entry gate. A signed-in operator who belongs to no
 * workspace lands here and must either CREATE one (becomes owner) or JOIN an
 * existing one via an invite code before reaching the command center. No one
 * enters the HUD un-onboarded.
 *
 * HUD-native (autosec-v2-hud skill): StarField + GlitchHex "eye" + HudCard /
 * HudTabs / HudInput / HudButton. Context-only, no redux.
 */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { logout } = useAuthContext() || {};

  const [mode, setMode] = useState('create');
  const [wsName, setWsName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');

  const busy = submitting;

  const enterHud = () => {
    // Full reload so SeedContext + the HUD hydrate against the new membership.
    window.location.assign('/');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!wsName.trim()) {
      setError('Name your workspace to continue.');
      return;
    }
    setSubmitting(true);
    setFailed(false);
    setError('');
    try {
      await apiClient.post('/workspaces/create/', {
        workspace_name: wsName.trim(),
        workspace_type: 'teamspace'
      });
      toast.success(`Workspace "${wsName.trim()}" created.`);
      enterHud();
    } catch (err) {
      setFailed(true);
      setError(
        err?.response?.data?.workspace_name?.[0] ||
          err?.response?.data?.detail ||
          'Could not create the workspace. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Enter an invite code to continue.');
      return;
    }
    setSubmitting(true);
    setFailed(false);
    setError('');
    try {
      await apiClient.post('/membership/invitations/accept/', {
        code: code.trim()
      });
      toast.success('Joined workspace.');
      enterHud();
    } catch (err) {
      setFailed(true);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          'Invalid or expired invite code.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setFailed(false);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md overflow-auto flex items-center justify-center">
      <div className="relative z-10 w-full max-w-md px-6 py-8">
        {/* Eye + heading */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-24 w-24 mb-4 flex items-center justify-center">
            <GlitchHex
              size={96}
              color={failed ? '#ff3b52' : '#2EDBE8'}
              active={busy || failed}
            />
            <span
              className={`absolute text-[30px] ${
                failed ? 'text-red-400' : 'text-cyan-400'
              }`}
            >
              ◉
            </span>
          </div>
          <HudText variant="title" color="cyan" className="tracking-[0.24em]">
            ESTABLISH WORKSPACE
          </HudText>
          <HudText
            variant="caption"
            color="cyan-muted"
            className="mt-1 tracking-[0.22em] text-center"
          >
            CREATE A NEW SECURITY WORKSPACE OR JOIN AN EXISTING ONE
          </HudText>
        </div>

        <HudStepper
          className="mb-5"
          current={0}
          steps={[
            { label: 'Establish Workspace' },
            { label: 'Command Center' }
          ]}
        />

        <HudCard surface="bg-black/50 backdrop-blur-xl" bodyClassName="p-8">
          <HudTabs
            className="mb-6"
            activeId={mode}
            onChange={switchMode}
            tabs={Object.entries(MODES).map(([id, label]) => ({ id, label }))}
          />

          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <HudText variant="bodySmall" color="muted">
                Name your organization&apos;s security workspace. You&apos;ll be
                its owner.
              </HudText>
              <HudInput
                icon={<FiGrid size={14} />}
                type="text"
                placeholder="Workspace name (e.g. Acme SOC)"
                autoFocus
                value={wsName}
                onChange={(e) => {
                  setWsName(e.target.value);
                  if (error) setError('');
                }}
                error={mode === 'create' ? error : ''}
              />
              <HudButton
                variant="primary"
                fullWidth
                type="submit"
                disabled={busy}
                glitch={failed}
              >
                {busy ? 'CREATING…' : 'CREATE WORKSPACE'}
              </HudButton>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <HudText variant="bodySmall" color="muted">
                Paste the invite code from your workspace admin.
              </HudText>
              <HudInput
                icon={<FiKey size={14} />}
                type="text"
                placeholder="Invite code"
                autoFocus
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError('');
                }}
                error={mode === 'join' ? error : ''}
              />
              <HudButton
                variant="primary"
                fullWidth
                type="submit"
                disabled={busy}
                glitch={failed}
              >
                {busy ? 'JOINING…' : 'JOIN WORKSPACE'}
              </HudButton>
            </form>
          )}
        </HudCard>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={async () => {
              try {
                await logout?.();
              } finally {
                navigate('/identity/login', { replace: true });
              }
            }}
            className="text-[10px] font-mono text-gray-600 hover:text-cyan-400 transition"
          >
            ← Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
