import { useMemo } from 'react';

export const usePaymentsProviderValue = ({
  state,
  methods,
  plans
}: {
  state: any;
  methods: any;
  plans: any;
}) =>
  useMemo(
    () => ({
      state,
      providers: state.providers,
      methodsBySeed: state.methodsBySeed,
      plansByMethod: state.plansByMethod,
      ...methods,
      ...plans
    }),
    [state, methods, plans]
  );
