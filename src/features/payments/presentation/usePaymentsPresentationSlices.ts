import { usePaymentMethodManagementPresentation } from './usePaymentMethodManagementPresentation';
import { usePaymentPlansPresentation } from './usePaymentPlansPresentation';

export const usePaymentsPresentationSlices = ({
  dispatch,
  actions
}: {
  dispatch: any;
  actions: any;
}) => {
  const methods = usePaymentMethodManagementPresentation({
    dispatch,
    actions
  });

  const plans = usePaymentPlansPresentation({
    dispatch,
    actions
  });

  return {
    methods,
    plans
  };
};
