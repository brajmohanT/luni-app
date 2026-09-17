import { z } from 'zod';

export const apiErrorCodeSchema = z.enum([
  'MISSING_ACCESS_TOKEN',
  'INVALID_ACCESS_TOKEN',
  'EMAIL_NOT_CONFIRMED',
  'VALIDATION_ERROR',
  'INVALID_JSON',
  'PAYLOAD_TOO_LARGE',
  'CONVERSATION_NOT_FOUND',
  'CHAT_REQUEST_IN_PROGRESS',
  'CONVERSATION_BUSY',
  'SERVICE_DRAINING',
  'SERVICE_UNAVAILABLE',
  'ROUTE_NOT_FOUND',
  'INVALID_REQUEST',
  'INTERNAL_ERROR',
]);

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  details: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});

export const conversationSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const messageSchema = z.object({
  id: z.uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  createdAt: z.string(),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  clientRequestId: z.uuid(),
  conversationId: z.uuid().optional(),
});

export const chatResponseSchema = z.object({
  reply: z.string(),
  responseId: z.string().nullable(),
  conversationId: z.uuid(),
});

export const listConversationsResponseSchema = z.object({
  conversations: z.array(conversationSchema),
});

export const conversationMessagesResponseSchema = z.object({
  conversation: conversationSchema,
  messages: z.array(messageSchema),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ListConversationsResponse = z.infer<typeof listConversationsResponseSchema>;
export type ConversationMessagesResponse = z.infer<typeof conversationMessagesResponseSchema>;
