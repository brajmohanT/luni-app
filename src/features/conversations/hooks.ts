import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  companionQueryOptions, companionMessagesQueryOptions, flattenCompanionMessages,
  sendChatMutationOptions,
} from '@/lib/queries/conversations';
import { useAuth } from '@/providers/auth-provider';

export function useCompanionConversation() {
  const { session } = useAuth();
  const client = useQueryClient();
  return useQuery(companionQueryOptions(client, session?.user.id));
}

export function useCompanionMessages() {
  const { session } = useAuth();
  const client = useQueryClient();
  return useInfiniteQuery({
    ...companionMessagesQueryOptions(client, session?.user.id),
    select: flattenCompanionMessages,
  });
}

// Temporary adapters until list/detail routing is replaced by continuous chat.
export function useConversations() {
  const query = useCompanionMessages();
  return { ...query, data: query.data ? [query.data.conversation] : undefined };
}

export function useConversationMessages(_conversationId: string | undefined) {
  return useCompanionMessages();
}

export function useSendChatMessage() {
  const { session } = useAuth();
  const client = useQueryClient();
  return useMutation(sendChatMutationOptions(client, session?.user.id));
}

export { conversationKeys } from '@/lib/queries/conversations';
