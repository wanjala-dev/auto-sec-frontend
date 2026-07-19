import { useCallback, useEffect, useState } from 'react';

import apiClient from '../../../infrastructure/http/apiClient';

/**
 * useOnboardingStatus — resolves whether the signed-in operator still needs to
 * onboard. Drives the entry gate: a fresh user must create or join a workspace
 * before reaching the command center.
 *
 * A user is considered ONBOARDED (never show them the gate) if EITHER:
 *   - their profile flag `is_onboard_complete` is true (set the moment they
 *     create OR join a workspace — covers a freshly created workspace that is
 *     still "inactive" until its own in-app setup is done), OR
 *   - they already own / belong to any workspace (`workspaces` non-empty).
 * We deliberately do NOT gate on the workspace's own `status` — a new workspace
 * being "inactive" is a separate concern the user finishes inside the app.
 *
 * Reads /identity/me/summary. Fails OPEN (needsOnboarding=false) on error so a
 * transient API blip never traps the user in a redirect loop.
 */
export function useOnboardingStatus() {
  const [state, setState] = useState({ loading: true, needsOnboarding: false });

  const check = useCallback(async () => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      setState({ loading: false, needsOnboarding: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await apiClient.get('/identity/me/summary/');
      const body = res?.data;
      const user = body?.data?.user ?? body?.user ?? {};
      const workspaces = body?.data?.workspaces ?? body?.workspaces ?? [];
      // Onboarded if the profile flag is set OR they already own/belong to any
      // workspace. Only a user with neither ever sees the gate (once, on first
      // login).
      const onboarded =
        user.is_onboard_complete === true || workspaces.length > 0;
      setState({ loading: false, needsOnboarding: !onboarded });
    } catch {
      setState({ loading: false, needsOnboarding: false });
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { ...state, refetch: check };
}
