import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getCompanionMessages,
  sendChatMessage,
} from '@/lib/api/conversations';
import type { ChatRequest } from '@/lib/api/types';
import { useAuth } from '@/providers/auth-provider';

const conversationKeys = {
  all: (userId: string) => ['conversations', userId] as const,
  list: (userId: string) => [...conversationKeys.all(userId), 'list'] as const,
  detail: (userId: string, conversationId: string) =>
    [...conversationKeys.all(userId), 'detail', conversationId] as const,
};

export function useConversations() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: conversationKeys.list(userId ?? 'anonymous'),
    queryFn: ({ signal }) => getCompanionMessages({}, { signal }),
    enabled: Boolean(userId),
    // Temporary adapter for the list screen until continuous-chat routing lands.
    select: ({ conversation }) => [conversation],
  });
}

export function useConversationMessages(conversationId: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: conversationKeys.detail(userId ?? 'anonymous', conversationId ?? 'unknown'),
    queryFn: ({ signal }) => getCompanionMessages({}, { signal }),
    enabled: Boolean(userId && conversationId),
  });
}

export function useSendChatMessage() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ChatRequest) => sendChatMessage(request),
    retry: false,
    onSuccess: async ({ conversationId }) => {
      if (!userId) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: conversationKeys.list(userId) }),
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(userId, conversationId) }),
      ]);
    },
  });
}

export { conversationKeys };
