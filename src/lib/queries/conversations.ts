import {
  CancelledError, infiniteQueryOptions, mutationOptions, queryOptions,
  type InfiniteData, type QueryClient,
} from '@tanstack/react-query';
import { getCompanionMessages, putCompanionConversation, sendChatMessage } from '@/lib/api/conversations';
import { ApiClientError } from '@/lib/api/errors';
import type {
  ChatRequest,
  ChatResponse,
  CompanionMessagesResponse,
  ReplyTarget,
} from '@/lib/api/types';
import { profileQueryOptions, requireAccount } from '@/lib/queries/profile';

export const conversationKeys = {
  all: (userId: string) => ['account', userId, 'conversations'] as const,
  companion: (userId: string) => [...conversationKeys.all(userId), 'companion'] as const,
  messages: (userId: string) => [...conversationKeys.all(userId), 'messages'] as const,
};

export function companionQueryOptions(client: QueryClient, userId: string | undefined) {
  return queryOptions({
    queryKey: conversationKeys.companion(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    staleTime: Infinity,
    retry: false,
    queryFn: async ({ signal }) => {
      requireAccount(userId);
      const profile = await client.fetchQuery(profileQueryOptions(userId));
      if (signal.aborted) throw new CancelledError({ revert: true });
      if (!profile.onboardingCompletedAt) {
        throw new ApiClientError('Complete onboarding to start your conversation.', {
          code: 'ONBOARDING_REQUIRED', status: 409, requestId: null,
        });
      }
      return putCompanionConversation({ signal, expectedUserId: userId });
    },
  });
}

export function companionMessagesQueryOptions(client: QueryClient, userId: string | undefined) {
  return infiniteQueryOptions({
    queryKey: conversationKeys.messages(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    retry: false,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      requireAccount(userId);
      await client.fetchQuery(companionQueryOptions(client, userId));
      if (signal.aborted) throw new CancelledError({ revert: true });
      return getCompanionMessages({ limit: 50, cursor: pageParam }, { signal, expectedUserId: userId });
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
  });
}

export function flattenCompanionMessages(data: InfiniteData<CompanionMessagesResponse>) {
  // Pages arrive newest first; each page is already chronological.
  // Keep server ordering (timestamps can have precision beyond JS Date).
  const messages = new Map<string, CompanionMessagesResponse['messages'][number]>();
  for (const page of [...data.pages].reverse()) {
    for (const message of page.messages) messages.set(message.id, message);
  }
  const oldestPage = data.pages[data.pages.length - 1];
  return {
    ...data.pages[0],
    messages: [...messages.values()],
    nextCursor: oldestPage.nextCursor,
    hasMore: oldestPage.hasMore,
  };
}

export function addCompletedSendToCache(
  client: QueryClient,
  userId: string,
  request: Readonly<ChatRequest>,
  replyTarget: ReplyTarget | null,
  response: ChatResponse,
) {
  client.setQueryData<InfiniteData<CompanionMessagesResponse>>(
    conversationKeys.messages(userId),
    current => {
      if (!current?.pages.length) return current;
      const knownIds = new Set(current.pages.flatMap(page => page.messages.map(message => message.id)));
      const messages: CompanionMessagesResponse['messages'] = [];
      if (!knownIds.has(response.userMessageId)) {
        messages.push({
          id: response.userMessageId,
          role: 'user',
          content: request.message,
          replyToMessageId: request.replyToMessageId ?? null,
          replyToMessage: replyTarget,
          createdAt: response.userMessageCreatedAt,
        });
      }
      if (!knownIds.has(response.assistantMessageId)) {
        messages.push({
          id: response.assistantMessageId,
          role: 'assistant',
          content: response.reply,
          replyToMessageId: null,
          replyToMessage: null,
          createdAt: response.assistantMessageCreatedAt,
        });
      }
      if (!messages.length) return current;
      const [newest, ...older] = current.pages;
      return {
        ...current,
        pages: [{
          ...newest,
          conversation: { ...newest.conversation, updatedAt: response.assistantMessageCreatedAt },
          messages: [...newest.messages, ...messages],
        }, ...older],
      };
    },
  );
}

export function sendChatMutationOptions(client: QueryClient, userId: string | undefined) {
  return mutationOptions({
    retry: false,
    mutationFn: async (request: ChatRequest) => {
      requireAccount(userId);
      await client.fetchQuery(companionQueryOptions(client, userId));
      return sendChatMessage(request, { requestId: request.clientRequestId, expectedUserId: userId });
    },
  });
}
