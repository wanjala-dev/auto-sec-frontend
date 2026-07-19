import { useMemo } from 'react';

export const useErrorToastProviderValue = ({
  toasts,
  addToast,
  removeToast,
  notifyError,
  notifySuccess
}: {
  toasts: any;
  addToast: any;
  removeToast: any;
  notifyError: any;
  notifySuccess: any;
}) =>
  useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      notifyError,
      notifySuccess
    }),
    [toasts, addToast, removeToast, notifyError, notifySuccess]
  );
