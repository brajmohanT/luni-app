import { apiRequest } from '@/lib/api/client';
import {
  chatRequestSchema,
  chatResponseSchema,
  companionConversationResponseSchema,
  companionMessagesQuerySchema,
  companionMessagesResponseSchema,
  type ChatRequest,
  type ChatResponse,
  type CompanionConversationResponse,
  type CompanionMessagesQuery,
  type CompanionMessagesResponse,
} from '@/lib/api/types';

type ConversationRequestOptions = {
  signal?: AbortSignal;
  expectedUserId?: string;
  requestId?: string;
};

export function putCompanionConversation(
  options: ConversationRequestOptions = {},
): Promise<CompanionConversationResponse> {
  return apiRequest({
    path: '/conversations/companion',
    method: 'PUT',
    responseSchema: companionConversationResponseSchema,
    signal: options.signal,
    expectedUserId: options.expectedUserId,
    requestId: options.requestId,
  });
}

export function getCompanionMessages(
  query: CompanionMessagesQuery = {},
  options: ConversationRequestOptions = {},
): Promise<CompanionMessagesResponse> {
  const { limit, cursor } = companionMessagesQuerySchema.parse(query);
  const parameters: string[] = [];
  if (limit !== undefined) parameters.push(`limit=${limit}`);
  if (cursor !== undefined) parameters.push(`cursor=${encodeURIComponent(cursor)}`);
  const suffix = parameters.length ? `?${parameters.join('&')}` : '';

  return apiRequest({
    path: `/conversations/companion/messages${suffix}`,
    method: 'GET',
    responseSchema: companionMessagesResponseSchema,
    signal: options.signal,
    expectedUserId: options.expectedUserId,
    requestId: options.requestId,
  });
}

export function sendChatMessage(
  request: ChatRequest,
  options: ConversationRequestOptions = {},
): Promise<ChatResponse> {
  const body = chatRequestSchema.parse(request);

  return apiRequest({
    path: '/chat',
    method: 'POST',
    body,
    responseSchema: chatResponseSchema,
    signal: options.signal,
    expectedUserId: options.expectedUserId,
    requestId: options.requestId,
  });
}
