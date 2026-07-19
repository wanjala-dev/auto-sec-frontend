// @ts-nocheck
import React, { createContext, useContext, useReducer } from 'react';

import paymentsReducer, {
  paymentsInitialState
} from '../../../reducer/paymentsReducer';
import { PAYMENT_ACTIONS } from './paymentContextActions';
import { usePaymentsPresentationSlices } from './usePaymentsPresentationSlices';
import { usePaymentsProviderValue } from './usePaymentsProviderValue';

type PaymentsProviderProps = {
  children: React.ReactNode;
};

const PaymentsContext = createContext(null as any);

export const PaymentsProvider = ({ children }: PaymentsProviderProps) => {
  const [state, dispatch] = useReducer(paymentsReducer, paymentsInitialState);
  const { methods, plans } = usePaymentsPresentationSlices({
    dispatch,
    actions: PAYMENT_ACTIONS
  });

  const value = usePaymentsProviderValue({
    state,
    methods,
    plans
  });

  return (
    <PaymentsContext.Provider value={value}>
      {children}
    </PaymentsContext.Provider>
  );
};

export const usePaymentsContext = () => {
  const context = useContext(PaymentsContext);
  if (!context) {
    throw new Error(
      'usePaymentsContext must be used within a PaymentsProvider'
    );
  }
  return context;
};

export { PaymentsContext };
