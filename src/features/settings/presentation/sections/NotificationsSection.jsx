import React, { useCallback, useEffect, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HudCard from '../../../../components/V2/HudCard';
import HudText from '../../../../components/V2/HudText';
import HudCheckbox from '../../../../components/V2/HudCheckbox';
import { readViewerSessionSnapshot } from '../../../auth/presentation/useViewerSession';
import { userPreferencesApi } from '../../../../infrastructure/userPreferences/userPreferencesApi';
import * as pushManager from '../../../../infrastructure/push/pushManager';

// iOS Safari only exposes web push once the app is installed to the Home
// Screen (standalone mode). Cheap one-liner detection for the hint below.
const isIosWithoutHomeScreenInstall = () =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(
    window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)')?.matches
  );

const resolveViewerUserId = () => {
  try {
    const { storedUser } = readViewerSessionSnapshot();
    return storedUser?.pk || storedUser?.id || null;
  } catch {
    return null;
  }
};

/**
 * NotificationsSection — Settings ▸ Notifications: the web-push opt-in.
 *
 * The toggle drives the full browser-side push lifecycle
 * (src/infrastructure/push/pushManager.ts): ask Notification permission on
 * the explicit gesture → register /service-worker.js → PushManager.subscribe
 * with the backend's VAPID key → POST the subscription; off tears both sides
 * down. The `push_notifications` boolean on /userpreferences/ is the backend
 * delivery gate and is persisted alongside.
 *
 * Degrades gracefully: unsupported browsers and servers without a VAPID key
 * show an explanatory line with the control disabled — never a crash.
 */
export default function NotificationsSection() {
  const [pushState, setPushState] = useState({
    checked: false,
    supported: false,
    permission: 'default',
    subscribed: false,
    vapidConfigured: false
  });
  const [preferenceEnabled, setPreferenceEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(null);

  // Passive capability + preference check only — reads Notification.permission,
  // the existing registration/subscription, and the stored preference. NEVER
  // requests permission here; that happens exclusively in the toggle handler
  // on an explicit gesture.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const userId = resolveViewerUserId();
      if (userId) {
        try {
          const res = await userPreferencesApi.getByUserId(userId);
          if (!cancelled) {
            setPreferenceEnabled(Boolean(res?.data?.push_notifications));
          }
        } catch {
          // Preference read is best-effort; the capability check below still
          // renders an accurate toggle.
        }
      }
      if (!pushManager.isSupported()) {
        if (!cancelled) {
          setPushState((prev) => ({ ...prev, checked: true, supported: false }));
        }
        return;
      }
      const status = await pushManager.getStatus();
      let vapidConfigured = false;
      try {
        vapidConfigured = Boolean(await pushManager.fetchVapidPublicKey());
      } catch {
        vapidConfigured = false;
      }
      if (!cancelled) {
        setPushState({
          checked: true,
          supported: true,
          permission: status.permission,
          subscribed: status.subscribed,
          vapidConfigured
        });
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const savePushPreference = useCallback(async (isEnabled) => {
    const userId = resolveViewerUserId();
    if (!userId) {
      toast.error('Missing user id.');
      return false;
    }
    try {
      // Same userpreferences PATCH the reference app uses — flipping
      // push_notifications flips the backend push channel gate.
      const res = await userPreferencesApi.updateByUserId(userId, {
        push_notifications: isEnabled
      });
      setPreferenceEnabled(Boolean(res?.data?.push_notifications ?? isEnabled));
      return true;
    } catch {
      toast.error('Unable to update browser notification preference.');
      return false;
    }
  }, []);

  const pushOn =
    preferenceEnabled &&
    pushState.subscribed &&
    pushState.permission === 'granted';
  const showIosInstallHint =
    !pushState.supported && isIosWithoutHomeScreenInstall();
  const pushUnavailable = pushState.supported && !pushState.vapidConfigured;

  const handlePushToggle = useCallback(async () => {
    if (busy || !pushState.supported || !pushState.vapidConfigured) {
      return;
    }
    const nextValue = !pushOn;
    setHint(null);
    setBusy(true);
    try {
      if (nextValue) {
        // Permission is requested HERE only — on the explicit toggle gesture.
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setPushState((prev) => ({ ...prev, permission }));
          setHint(
            permission === 'denied'
              ? 'Notifications are blocked for this site — allow them in your browser settings, then try again.'
              : 'Notification permission was not granted.'
          );
          return;
        }
        const status = await pushManager.subscribe();
        setPushState((prev) => ({
          ...prev,
          permission: status.permission,
          subscribed: status.subscribed
        }));
        if (!status.subscribed) {
          setHint('Browser notifications are not available right now.');
          return;
        }
        await savePushPreference(true);
      } else {
        const status = await pushManager.unsubscribe();
        setPushState((prev) => ({
          ...prev,
          permission: status.permission,
          subscribed: status.subscribed
        }));
        await savePushPreference(false);
      }
    } catch {
      setHint('Could not update browser notifications. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, pushOn, pushState.supported, pushState.vapidConfigured, savePushPreference]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <FiBell className="text-hud-accent" size={16} />
        <HudText variant="heading" color="light">
          NOTIFICATIONS
        </HudText>
      </div>

      <HudCard bodyClassName="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <HudText variant="bodySmall" color="light">
              Browser notifications
            </HudText>
            <p className="text-[9px] font-mono text-hud-dim">
              Get a device notification when something needs you, even with the
              app closed.
            </p>
            {!pushState.checked ? (
              <p className="text-[9px] font-mono text-hud-dim">Checking…</p>
            ) : null}
            {pushState.checked && !pushState.supported && !showIosInstallHint && (
              <p className="text-[9px] font-mono text-hud-dim">
                This browser does not support push notifications.
              </p>
            )}
            {showIosInstallHint && (
              <p className="text-[9px] font-mono text-hud-dim">
                On iPhone and iPad, add this app to your Home Screen first to
                enable notifications.
              </p>
            )}
            {pushUnavailable && (
              <p className="text-[9px] font-mono text-hud-dim">
                Push notifications aren&apos;t set up on this server yet.
              </p>
            )}
            {hint && (
              <p className="text-[9px] font-mono text-amber-400/80">{hint}</p>
            )}
          </div>
          <HudCheckbox
            checked={pushOn}
            onChange={handlePushToggle}
            disabled={
              !pushState.checked ||
              !pushState.supported ||
              pushUnavailable ||
              busy
            }
            title="Browser notifications"
            aria-label="Browser notifications"
          />
        </div>
      </HudCard>
    </div>
  );
}
