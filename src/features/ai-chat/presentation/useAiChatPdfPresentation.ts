import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  createPdfConversationForWorkspace,
  getSeedConversationMessages,
  getUploadedFileStatus,
  listSeedConversations,
  sendConversationMessage,
  uploadWorkspacePdf
} from '../../../application/aiChat/aiChatService';

export const useAiChatPdfPresentation = ({
  resolveSeedId
}: {
  resolveSeedId: (seedId?: any) => any;
}) => {
  const uploadPdfFile = useCallback(
    async (file, seedId) => {
      if (!file) return null;
      const resolvedSeedId = resolveSeedId(seedId);
      if (!resolvedSeedId) {
        toast.error('Select a seed before uploading a PDF.');
        return null;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('workspace_id', resolvedSeedId);
        // Uploading here IS the explicit ask — the whole point is to chat
        // with the document, and chat retrieval reads indexed chunks.
        // (Indexing is opt-in platform-wide; general uploads stay
        // un-indexed until the user clicks Index.)
        formData.append('index', 'true');
        return await uploadWorkspacePdf(formData);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to upload PDF.');
        return null;
      }
    },
    [resolveSeedId]
  );

  const getPdfProcessingStatus = useCallback(async (fileId) => {
    if (!fileId) return null;
    try {
      return await getUploadedFileStatus(fileId);
    } catch (_) {
      return null;
    }
  }, []);

  const pollPdfProcessingStatus = useCallback(
    async (fileId, { intervalMs = 2000, maxAttempts = 15 } = {}) => {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        // eslint-disable-next-line no-await-in-loop
        const status = await getPdfProcessingStatus(fileId);
        if (
          status?.processing_status === 'completed' ||
          status?.processing_status === 'failed'
        ) {
          return status;
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      return null;
    },
    [getPdfProcessingStatus]
  );

  const listPdfConversations = useCallback(
    async (seedId, params = {}) => {
      const resolvedSeedId = resolveSeedId(seedId);
      if (!resolvedSeedId) return [];
      try {
        return await listSeedConversations(resolvedSeedId, params);
      } catch (error) {
        toast.error(
          error?.response?.data?.message || 'Failed to load PDF conversations.'
        );
        return [];
      }
    },
    [resolveSeedId]
  );

  const createPdfConversation = useCallback(
    async (pdfId, seedId, title = 'PDF Conversation') => {
      const resolvedSeedId = resolveSeedId(seedId);
      if (!resolvedSeedId || !pdfId) {
        toast.error('PDF and seed are required to start a conversation.');
        return null;
      }
      try {
        const conversation = await createPdfConversationForWorkspace(
          pdfId,
          resolvedSeedId,
          title
        );
        const id = conversation?.id;
        if (!id) {
          toast.error('Failed to resolve PDF conversation id.');
          return null;
        }
        return conversation;
      } catch (error) {
        toast.error(
          error?.response?.data?.message || 'Failed to create PDF conversation.'
        );
        return null;
      }
    },
    [resolveSeedId]
  );

  const getPdfConversationMessages = useCallback(async (conversationId) => {
    if (!conversationId) return [];
    try {
      return await getSeedConversationMessages(conversationId);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to load PDF messages.'
      );
      return [];
    }
  }, []);

  const sendPdfConversationMessage = useCallback(
    async (conversationId, input) => {
      if (!conversationId || !input) return null;
      try {
        return await sendConversationMessage(conversationId, input);
      } catch (error) {
        toast.error(
          error?.response?.data?.message || 'Failed to send PDF chat message.'
        );
        return null;
      }
    },
    []
  );

  return {
    uploadPdfFile,
    pollPdfProcessingStatus,
    listPdfConversations,
    createPdfConversation,
    getPdfConversationMessages,
    sendPdfConversationMessage
  };
};
