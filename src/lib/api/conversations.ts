import { apiRequest } from '@/lib/api/client';
import {
  chatRequestSchema,
  chatResponseSchema,
  conversationMessagesResponseSchema,
  listConversationsResponseSchema,
  type ChatRequest,
} from '@/lib/api/types';

export function listConversations() {
  return apiRequest({
    path: '/conversations',
    responseSchema: listConversationsResponseSchema,
  });
}

export function getConversationMessages(conversationId: string) {
  return apiRequest({
    path: `/conversations/${encodeURIComponent(conversationId)}/messages`,
    responseSchema: conversationMessagesResponseSchema,
  });
}

export function sendChatMessage(request: ChatRequest) {
  const body = chatRequestSchema.parse(request);

  return apiRequest({
    path: '/chat',
    method: 'POST',
    body,
    responseSchema: chatResponseSchema,
  });
}
