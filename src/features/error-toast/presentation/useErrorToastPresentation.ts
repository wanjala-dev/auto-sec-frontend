import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { getIsOffline } from '../../../infrastructure/http/apiClient';

type ToastKind = 'error' | 'success' | 'warn' | 'warning' | 'info';

type ToastInput = {
  message?: string;
  msg?: string;
  title?: string;
  type?: ToastKind;
  error?: boolean;
  options?: Record<string, unknown>;
  __id?: string | number;
};

export const useErrorToastPresentation = ({
  setToasts
}: {
  setToasts: any;
}) => {
  const normalizeToast = useCallback(
    (input?: ToastInput | string): ToastInput => {
      if (typeof input === 'string') {
        return { message: input };
      }
      return input || {};
    },
    []
  );

  const resolveMessage = useCallback(
    (input: ToastInput = {}) =>
      input.message || input.msg || input.title || 'Notification',
    []
  );

  const resolveType = useCallback((input: ToastInput = {}): ToastKind => {
    if (input.type) return input.type;
    if (input.error === true) return 'error';
    if (input.error === false) return 'success';
    return 'info';
  }, []);

  const triggerToast = useCallback(
    (input?: ToastInput | string) => {
      // When the server is unreachable, suppress all toasts — the
      // ConnectivityBanner handles messaging globally.
      if (getIsOffline()) return undefined;

      const toastData = normalizeToast(input);
      const type = resolveType(toastData);
      const message = resolveMessage(toastData);
      const commonOpts = { ...(toastData.options || {}) };

      switch (type) {
        case 'error':
          return toast.error(message, { icon: '⚠️', ...commonOpts });
        case 'success':
          return toast.success(message, commonOpts);
        case 'warn':
        case 'warning':
          return toast.warn(message, commonOpts);
        default:
          return toast(message, commonOpts);
      }
    },
    [normalizeToast, resolveMessage, resolveType]
  );

  const addToast = useCallback(
    (toastInput: ToastInput | string) => {
      const id = triggerToast(toastInput);
      if (toastInput && typeof toastInput === 'object') {
        toastInput.__id = id;
      }
      return id;
    },
    [triggerToast]
  );

  const removeToast = useCallback(
    (toastInput: ToastInput | string | number) => {
      let toastId: string | number | undefined;

      if (typeof toastInput === 'object' && toastInput !== null) {
        toastId = toastInput.__id;
      } else {
        toastId = toastInput as string | number;
      }

      setToasts((toastList) => {
        return toastList.filter((current) => current.__id !== toastId);
      });

      if (toastId !== undefined && toastId !== null) {
        toast.dismiss(toastId);
      }
    },
    [setToasts]
  );

  const notifyError = useCallback(
    (message: string, options: Record<string, unknown> = {}) =>
      triggerToast({ message, type: 'error', options }),
    [triggerToast]
  );

  const notifySuccess = useCallback(
    (message: string, options: Record<string, unknown> = {}) =>
      triggerToast({ message, type: 'success', options }),
    [triggerToast]
  );

  return {
    addToast,
    removeToast,
    notifyError,
    notifySuccess
  };
};
