import React, { createContext, useContext, useReducer } from 'react';

import filterReducer from '../../../reducer/filterReducer';
import { filterInitialState } from './filterContextConfig';
import { useFilterProviderComposition } from './useFilterProviderComposition';

type FilterProviderProps = {
  children: React.ReactNode;
};

const FilterContext = createContext(null as any);

const FilterProvider = ({ children }: FilterProviderProps) => {
  const [state, dispatch] = useReducer(filterReducer, filterInitialState);

  const value = useFilterProviderComposition({
    state,
    dispatch
  });

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
};

export const useFilterContext = () => {
  const context = useContext(FilterContext);
  if (context === null) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
};

export { FilterContext, FilterProvider };
