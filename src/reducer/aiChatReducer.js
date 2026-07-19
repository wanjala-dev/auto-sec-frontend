import {
  AI_CHAT_LOADING,
  AI_CHAT_SUCCESS,
  AI_CHAT_ERROR,
  AI_CHAT_SET_REPLY,
  AI_CHAT_CLEAR,
  AI_CHAT_SET_CONVERSATION,
  AI_CHAT_ADD_HISTORY,
  AI_CHAT_CLEAR_HISTORY,
  AI_CHAT_CONVERSATIONS_LOADING,
  AI_CHAT_SET_CONVERSATIONS,
  AI_CHAT_CONVERSATIONS_ERROR,
  AI_CHAT_SET_CONVERSATION_MESSAGES
} from '../types/aiChatTypes';

export const initialAiChatState = {
  loading: false,
  error: null,
  lastReply: '',
  conversationId: null,
  history: [], // array of recent user queries for the current conversation
  conversations: [],
  conversationMessages: []
};

const aiChatReducer = (state, action) => {
  const { type, payload } = action;
  switch (type) {
    case AI_CHAT_LOADING:
      return { ...state, loading: true, error: null };
    case AI_CHAT_SET_REPLY:
      return { ...state, lastReply: payload, loading: false, error: null };
    case AI_CHAT_SUCCESS:
      return { ...state, loading: false };
    case AI_CHAT_ERROR:
      return { ...state, loading: false, error: payload };
    case AI_CHAT_CLEAR:
      return { ...initialAiChatState };
    case AI_CHAT_SET_CONVERSATION:
      return { ...state, conversationId: action.payload };
    case AI_CHAT_ADD_HISTORY: {
      const next = [
        action.payload,
        ...state.history.filter((h) => h !== action.payload)
      ];
      // cap history length to 20
      return { ...state, history: next.slice(0, 20) };
    }
    case AI_CHAT_CLEAR_HISTORY:
      return { ...state, history: [] };
    case AI_CHAT_CONVERSATIONS_LOADING:
      return { ...state, loading: true };
    case AI_CHAT_SET_CONVERSATIONS:
      return { ...state, loading: false, conversations: action.payload || [] };
    case AI_CHAT_CONVERSATIONS_ERROR:
      return { ...state, loading: false, error: action.payload };
    case AI_CHAT_SET_CONVERSATION_MESSAGES:
      return { ...state, conversationMessages: action.payload || [] };
    default:
      return state;
  }
};

export default aiChatReducer;
