import { useMemo } from 'react';

export const useAiChatProviderValue = ({
  state,
  dispatch,
  conversation,
  pdf
}) =>
  useMemo(
    () => ({
      ...state,
      dispatch,
      askSeedQuestion: conversation.askSeedQuestion,
      askSeedQuestionStream: conversation.askSeedQuestionStream,
      createConversation: conversation.createConversation,
      getConversationsBySeed: conversation.getConversationsBySeed,
      getConversationDetail: conversation.getConversationDetail,
      deleteConversation: conversation.deleteConversation,
      clearAgentMemory: conversation.clearAgentMemory,
      uploadPdfFile: pdf.uploadPdfFile,
      pollPdfProcessingStatus: pdf.pollPdfProcessingStatus,
      listPdfConversations: pdf.listPdfConversations,
      createPdfConversation: pdf.createPdfConversation,
      getPdfConversationMessages: pdf.getPdfConversationMessages,
      sendPdfConversationMessage: pdf.sendPdfConversationMessage
    }),
    [state, dispatch, conversation, pdf]
  );
