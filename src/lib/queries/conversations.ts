import {
  infiniteQueryOptions, mutationOptions, queryOptions,
  type InfiniteData, type QueryClient,
} from '@tanstack/react-query';
import { getCompanionMessages, putCompanionConversation, sendChatMessage } from '@/lib/api/conversations';
import { ApiClientError } from '@/lib/api/errors';
import type { ChatRequest, CompanionMessagesResponse } from '@/lib/api/types';
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
      signal.throwIfAborted();
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
      signal.throwIfAborted();
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

export function sendChatMutationOptions(client: QueryClient, userId: string | undefined) {
  return mutationOptions({
    retry: false,
    mutationFn: async (request: ChatRequest) => {
      requireAccount(userId);
      await client.fetchQuery(companionQueryOptions(client, userId));
      return sendChatMessage(request, { requestId: request.clientRequestId, expectedUserId: userId });
    },
    onSuccess: async () => {
      requireAccount(userId);
      // Refetch loaded pages from the newest cursor, preserving server IDs/quotes.
      await client.invalidateQueries({ queryKey: conversationKeys.messages(userId) });
    },
  });
}
