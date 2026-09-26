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
  'CHAT_REQUEST_PAYLOAD_MISMATCH',
  'CONVERSATION_BUSY',
  'COMPANION_CONVERSATION_NOT_FOUND',
  'ONBOARDING_PROFILE_INCOMPLETE',
  'ONBOARDING_REQUIRED',
  'REPLY_TARGET_NOT_FOUND',
  'SERVICE_DRAINING',
  'SERVICE_UNAVAILABLE',
  'ROUTE_NOT_FOUND',
  'INVALID_REQUEST',
  'INTERNAL_ERROR',
]);

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

const timestampSchema = z.iso.datetime({ offset: true });

export const conversationStyleSchema = z.enum([
  'warm_balanced',
  'gentle_reassuring',
  'playful_casual',
  'direct_thoughtful',
]);

export const profileSchema = z.strictObject({
  email: z.email(),
  preferredName: z.string().min(1).max(40).nullable(),
  conversationStyle: conversationStyleSchema,
  onboardingCompletedAt: timestampSchema.nullable(),
  profileVersion: z.number().int().min(0),
});

export const updateProfileRequestSchema = z.strictObject({
  preferredName: z.string().trim().min(1).max(40).optional(),
  conversationStyle: conversationStyleSchema.optional(),
}).refine(
  ({ preferredName, conversationStyle }) =>
    preferredName !== undefined || conversationStyle !== undefined,
  { message: 'Provide a preferred name or conversation style.' },
);

// Onboarding completion has no request body and returns profileSchema.
export const conversationSchema = z.strictObject({
  id: z.uuid(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const replyTargetSchema = z.strictObject({
  id: z.uuid(),
  role: z.literal('assistant'),
  content: z.string(),
});

export const messageSchema = z.strictObject({
  id: z.uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  replyToMessageId: z.uuid().nullable(),
  replyToMessage: replyTargetSchema.nullable(),
  createdAt: timestampSchema,
});

export const chatRequestSchema = z.strictObject({
  message: z.string().trim().min(1).max(4000),
  clientRequestId: z.uuid(),
  replyToMessageId: z.uuid().optional(),
});

export const chatResponseSchema = z.strictObject({
  reply: z.string(),
  responseId: z.string().nullable(),
  conversationId: z.uuid(),
  userMessageId: z.uuid(),
  assistantMessageId: z.uuid(),
  userMessageCreatedAt: timestampSchema,
  assistantMessageCreatedAt: timestampSchema,
});

export const companionConversationResponseSchema = z.strictObject({
  conversation: conversationSchema,
  created: z.boolean(),
});

export const companionMessagesQuerySchema = z.strictObject({
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).max(512).optional(),
});

export const companionMessagesResponseSchema = z.strictObject({
  conversation: conversationSchema,
  messages: z.array(messageSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ConversationStyle = z.infer<typeof conversationStyleSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type ReplyTarget = z.infer<typeof replyTargetSchema>;
export type Message = z.infer<typeof messageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type CompanionConversationResponse = z.infer<typeof companionConversationResponseSchema>;
export type CompanionMessagesQuery = z.infer<typeof companionMessagesQuerySchema>;
export type CompanionMessagesResponse = z.infer<typeof companionMessagesResponseSchema>;
