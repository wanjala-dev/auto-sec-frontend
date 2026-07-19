import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useErrorToastPresentation } from './useErrorToastPresentation';
import { useErrorToastProviderValue } from './useErrorToastProviderValue';

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

type ErrorToastContextValue = {
  toasts: ToastInput[];
  addToast: (toastInput: ToastInput | string) => string | number;
  removeToast: (toastInput: ToastInput | string | number) => void;
  notifyError: (
    message: string,
    options?: Record<string, unknown>
  ) => string | number;
  notifySuccess: (
    message: string,
    options?: Record<string, unknown>
  ) => string | number;
};

export const ErrorToastContext = React.createContext(
  null as ErrorToastContextValue | null
);

export function useErrorToastContext() {
  const context = React.useContext(ErrorToastContext);
  if (context === null) {
    throw new Error(
      'useErrorToastContext must be used within an ErrorToastContextProvider'
    );
  }
  return context;
}

export default function ErrorToastContextProvider({
  children
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastInput[]>([]);

  const { addToast, removeToast, notifyError, notifySuccess } =
    useErrorToastPresentation({
      setToasts
    });

  const contextValue = useErrorToastProviderValue({
    toasts,
    addToast,
    removeToast,
    notifyError,
    notifySuccess
  });

  return (
    <ErrorToastContext.Provider value={contextValue}>
      <ToastContainer position="top-right" newestOnTop closeOnClick />
      {children}
    </ErrorToastContext.Provider>
  );
}

export { ErrorToastContextProvider };
