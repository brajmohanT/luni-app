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

export function useSendChatMessage() {
  const { session } = useAuth();
  const client = useQueryClient();
  return useMutation(sendChatMutationOptions(client, session?.user.id));
}

export { conversationKeys } from '@/lib/queries/conversations';
