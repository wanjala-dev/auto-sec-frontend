import { useAiChatConversationPresentation } from './useAiChatConversationPresentation';
import { useAiChatPdfPresentation } from './useAiChatPdfPresentation';

export const useAiChatPresentationSlices = ({
  dispatch,
  state,
  actions,
  seed,
  seeds
}) => {
  const conversation = useAiChatConversationPresentation({
    dispatch,
    state,
    actions,
    seed,
    seeds
  });

  const pdf = useAiChatPdfPresentation({
    resolveSeedId: conversation.resolveSeedId
  });

  return {
    conversation,
    pdf
  };
};
