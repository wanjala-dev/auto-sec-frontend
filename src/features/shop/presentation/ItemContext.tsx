import React, { useContext, useReducer } from 'react';

import itemReducer from '../../../reducer/itemReducer';
import { ITEM_ACTIONS, itemInitialState } from './itemContextConfig';
import { useItemPresentationSlices } from './useItemPresentationSlices';
import { useItemProviderSupport } from './useItemProviderSupport';
import { useItemProviderValue } from './useItemProviderValue';

type ItemProviderProps = {
  children: React.ReactNode;
};

const ItemContext = React.createContext(null as any);

const ItemProvider = ({ children }: ItemProviderProps) => {
  const [state, dispatch] = useReducer(itemReducer, itemInitialState);

  const support = useItemProviderSupport({
    dispatch
  });

  const { catalog, mutation } = useItemPresentationSlices({
    dispatch,
    actions: ITEM_ACTIONS,
    support
  });

  const value = useItemProviderValue({
    state,
    catalog,
    mutation,
    support
  });

  return <ItemContext.Provider value={value}>{children}</ItemContext.Provider>;
};

export const useItemContext = () => {
  const context = useContext(ItemContext);
  if (context === null) {
    throw new Error('useItemContext must be used within an ItemProvider');
  }
  return context;
};

export { ItemContext, ItemProvider };
