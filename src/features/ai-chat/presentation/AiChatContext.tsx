import React, { createContext, useContext, useReducer } from 'react';
import type { Dispatch } from 'react';

import { useSeedContext } from '../../seed/presentation/SeedContext';
import aiChatReducer, {
  initialAiChatState
} from '../../../reducer/aiChatReducer';
import { AI_CHAT_ACTIONS } from './aiChatContextActions';
import { useAiChatPresentationSlices } from './useAiChatPresentationSlices';
import { useAiChatProviderValue } from './useAiChatProviderValue';

type AiChatAction = {
  type: string;
  payload?: any;
};

type AiChatProviderProps = {
  children: React.ReactNode;
};

const AiChatContext = createContext(null as any);

const AiChatProvider = ({ children }: AiChatProviderProps) => {
  const [state, rawDispatch] = useReducer(aiChatReducer, initialAiChatState);
  const dispatch = rawDispatch as Dispatch<AiChatAction>;
  const { seed, seeds } = useSeedContext?.() || { seed: null, seeds: [] };
  const { conversation, pdf } = useAiChatPresentationSlices({
    dispatch,
    state,
    seed,
    seeds,
    actions: AI_CHAT_ACTIONS
  });

  const value = useAiChatProviderValue({
    state,
    dispatch,
    conversation,
    pdf
  });

  return (
    <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>
  );
};

export const useAiChatContext = () => {
  const context = useContext(AiChatContext);
  if (context === null) {
    throw new Error('useAiChatContext must be used within an AiChatProvider');
  }
  return context;
};

export { AiChatContext, AiChatProvider };
