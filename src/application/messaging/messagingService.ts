import { messagingApi } from '../../infrastructure/messaging/messagingApi';

const normalizeList = (response: any) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.conversations)) return data.conversations;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeMessages = (response: any) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeConversation = (conv: any) => {
  if (!conv) return null;
  const id = conv.id || conv.pk || conv.uuid;
  const participants = Array.isArray(conv.participants)
    ? conv.participants
    : [];
  // Backend enriches the list with the other participant's display fields.
  const other = conv.other_participant || conv.otherParticipant || null;
  const lastMessage =
    conv.last_message || conv.lastMessage || conv.latest_message || null;
  const lastMessageText =
    lastMessage?.body || lastMessage?.text || lastMessage?.content || '';
  const lastMessageAt =
    lastMessage?.created_at ||
    lastMessage?.timestamp ||
    conv.updated_at ||
    conv.created_at ||
    '';

  const displayName =
    other?.display_name ||
    other?.displayName ||
    conv.subject ||
    conv.title ||
    '';

  return {
    id: String(id),
    // Title is the person you're talking to (falls back to any subject).
    subject: displayName,
    title: displayName,
    avatarUrl: other?.avatar_url || other?.avatarUrl || '',
    initials: other?.initials || '',
    otherParticipantId: other?.user_id || other?.userId || null,
    participants,
    lastMessageText,
    lastMessageAt,
    lastMessageSenderId:
      lastMessage?.sender_id || lastMessage?.senderId || null,
    unreadCount: conv.unread_count || conv.unreadCount || 0,
    isArchived: conv.is_archived || conv.archived || false,
    isStarred: conv.is_starred || conv.starred || false,
    isMuted: conv.is_muted || conv.muted || false,
    createdAt: conv.created_at || conv.createdAt || ''
  };
};

const normalizeMessage = (msg: any) => {
  if (!msg) return null;
  return {
    id: String(msg.id || msg.pk || msg.uuid),
    sender: msg.sender || msg.author || msg.user || null,
    senderId:
      msg.sender_id || msg.sender?.id || msg.author_id || msg.user_id || null,
    senderName:
      msg.sender_name ||
      msg.sender?.username ||
      msg.sender?.name ||
      msg.author?.username ||
      'Unknown',
    body: msg.body || msg.text || msg.content || '',
    messageType: msg.message_type || msg.messageType || 'text',
    imageUrl: msg.image || msg.image_url || msg.imageUrl || null,
    metadata: msg.metadata || {},
    createdAt: msg.created_at || msg.timestamp || '',
    isOwn: false // set by the caller based on current user
  };
};

export const messagingService = {
  fetchConversations: async () => {
    const response = await messagingApi.listConversations();
    const items = normalizeList(response);
    return items.map(normalizeConversation).filter(Boolean);
  },

  startConversation: async (recipientId: string, workspaceId?: string) => {
    const response = await messagingApi.startConversation({
      recipient_id: recipientId,
      workspace_id: workspaceId
    });
    const data = response?.data?.data || response?.data;
    return normalizeConversation(data);
  },

  fetchMessages: async (conversationId: string) => {
    const response = await messagingApi.getMessages(conversationId);
    const items = normalizeMessages(response);
    return items.map(normalizeMessage).filter(Boolean);
  },

  sendMessage: async (
    conversationId: string,
    body: string,
    image?: File | null
  ) => {
    const response = await messagingApi.sendMessage(conversationId, {
      body,
      image
    });
    const data = response?.data?.data || response?.data;
    return normalizeMessage(data);
  },

  deleteMessage: async (messageId: string) => {
    await messagingApi.deleteMessage(messageId);
  },

  markRead: async (conversationId: string) => {
    await messagingApi.markRead(conversationId);
  },

  getUnreadCount: async () => {
    const response = await messagingApi.getUnreadCount();
    const data = response?.data;
    // Backend shape: { total, conversations: [{ conversation_id, count }] }.
    if (data && typeof data.total === 'number') return data.total;
    // Fallbacks: a bare array of per-conversation counts, or a scalar.
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.conversations)
      ? data.conversations
      : null;
    if (list) {
      return list.reduce((sum: number, row: any) => sum + (row?.count || 0), 0);
    }
    return data?.unread_count || data?.count || 0;
  },

  searchUsers: async (q: string, workspaceId?: string) => {
    const response = await messagingApi.searchUsers(q, workspaceId);
    const rows =
      response?.data?.results || response?.data?.data || response?.data || [];
    return (Array.isArray(rows) ? rows : []).map((u: any) => ({
      id: u.id || u.pk || u.user_id,
      name: u.display_name || u.name || u.email,
      email: u.email,
      avatar: u.photo_url || u.avatar_url || null
    }));
  }
};
