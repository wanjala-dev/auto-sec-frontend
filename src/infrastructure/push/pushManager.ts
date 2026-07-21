import apiClient from '../http/apiClient';

/**
 * Web-push subscription manager.
 *
 * Owns the full browser-side push lifecycle: feature detection, VAPID key
 * lookup, service-worker registration (which happens ONLY here, as part of
 * subscribe() — never on page load), PushManager subscription, and syncing
 * the subscription with the backend registry
 * (POST/DELETE /notifications/push/subscriptions/).
 *
 * Notification.requestPermission() is intentionally NOT called here — the
 * Settings toggle requests permission on an explicit user gesture and only
 * then calls subscribe().
 */

const SERVICE_WORKER_URL = '/service-worker.js';
const VAPID_KEY_PATH = '/notifications/push/vapid-public-key/';
const SUBSCRIPTIONS_PATH = '/notifications/push/subscriptions/';

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
}

const UNSUPPORTED_STATUS: PushStatus = {
  supported: false,
  permission: 'unsupported',
  subscribed: false
};

export const isSupported = (): boolean =>
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  typeof Notification !== 'undefined';

/**
 * Standard base64url → Uint8Array conversion for the VAPID applicationServerKey.
 */
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Short human-readable device label derived from the user agent
 * (e.g. "Chrome on macOS") — stored against the subscription so the user
 * can recognise the device later.
 */
const shortDeviceLabel = (): string => {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /opr\//i.test(ua)
    ? 'Opera'
    : /firefox\//i.test(ua)
    ? 'Firefox'
    : /chrome\//i.test(ua)
    ? 'Chrome'
    : /safari\//i.test(ua)
    ? 'Safari'
    : 'Browser';
  const os = /windows/i.test(ua)
    ? 'Windows'
    : /android/i.test(ua)
    ? 'Android'
    : /iphone|ipad|ipod/i.test(ua)
    ? 'iOS'
    : /mac os x/i.test(ua)
    ? 'macOS'
    : /linux/i.test(ua)
    ? 'Linux'
    : 'unknown OS';
  return `${browser} on ${os}`.slice(0, 100);
};

/**
 * Fetch the VAPID public key. Empty string means push is not provisioned
 * on this server — callers must treat that as "do not prompt, do not
 * subscribe".
 */
export const fetchVapidPublicKey = async (): Promise<string> => {
  const response = await apiClient.get(VAPID_KEY_PATH);
  const key = response?.data?.key;
  return typeof key === 'string' ? key.trim() : '';
};

const getExistingSubscription = async (): Promise<PushSubscription | null> => {
  const registration = await navigator.serviceWorker.getRegistration(
    SERVICE_WORKER_URL
  );
  if (!registration) return null;
  return registration.pushManager.getSubscription();
};

export const getStatus = async (): Promise<PushStatus> => {
  if (!isSupported()) {
    return UNSUPPORTED_STATUS;
  }
  let subscribed = false;
  try {
    subscribed = Boolean(await getExistingSubscription());
  } catch {
    // A broken/orphaned registration reads as "not subscribed" — the
    // subscribe flow re-registers from scratch.
    subscribed = false;
  }
  return {
    supported: true,
    permission: Notification.permission,
    subscribed
  };
};

/**
 * Register the service worker, create the PushSubscription, and record it on
 * the backend. Requires Notification permission to already be granted (the
 * caller owns the permission prompt). Aborts quietly — returning the current
 * status with subscribed=false — when the VAPID key is not provisioned.
 */
export const subscribe = async (): Promise<PushStatus> => {
  if (!isSupported()) {
    return UNSUPPORTED_STATUS;
  }

  const key = await fetchVapidPublicKey();
  if (!key) {
    // Push not provisioned server-side — nothing to subscribe to.
    return getStatus();
  }

  await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  const registration = await navigator.serviceWorker.ready;

  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key)
    }));

  const json = subscription.toJSON();
  await apiClient.post(SUBSCRIPTIONS_PATH, {
    endpoint: json.endpoint,
    keys: json.keys,
    device_label: shortDeviceLabel(),
    platform: 'web'
  });

  return {
    supported: true,
    permission: Notification.permission,
    subscribed: true
  };
};

/**
 * Tear the subscription down on both sides. Best-effort and idempotent:
 * the browser unsubscribe and the backend DELETE are each attempted
 * independently so a failure of one doesn't leave the other dangling.
 */
export const unsubscribe = async (): Promise<PushStatus> => {
  if (!isSupported()) {
    return UNSUPPORTED_STATUS;
  }

  let endpoint: string | null = null;
  try {
    const subscription = await getExistingSubscription();
    if (subscription) {
      endpoint = subscription.endpoint;
      await subscription.unsubscribe();
    }
  } catch {
    // Browser-side teardown is best-effort; still tell the backend below
    // if we managed to read the endpoint.
  }

  if (endpoint) {
    try {
      await apiClient.delete(SUBSCRIPTIONS_PATH, { data: { endpoint } });
    } catch {
      // DELETE is idempotent server-side; a transient failure here leaves a
      // dead endpoint the backend prunes on its next failed delivery.
    }
  }

  return getStatus();
};
