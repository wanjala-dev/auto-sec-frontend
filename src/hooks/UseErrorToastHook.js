import { useCallback, useContext } from 'react';
import { ErrorToastContext } from '../features/error-toast/presentation/ErrorToastContext';

function useErrorToast(timeout) {
  const {
    toasts,
    addToast: originalAddToast,
    removeToast,
    notifyError,
    notifySuccess
  } = useContext(ErrorToastContext);

  const addToast = useCallback(
    (toast) => {
      originalAddToast(toast);
      const appliedTimeout = toast?.timeout ?? timeout;
      if (appliedTimeout > 0)
        setTimeout(() => removeToast(toast), appliedTimeout);
    },
    [originalAddToast, removeToast, timeout]
  );

  return { toasts, addToast, removeToast, notifyError, notifySuccess };
}

export { useErrorToast };
