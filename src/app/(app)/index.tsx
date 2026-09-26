import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useConversations } from '@/features/conversations/hooks';
import { isApiClientError } from '@/lib/api/errors';
import type { Conversation } from '@/lib/api/types';

// Formats the server timestamp for a conversation row.
function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently updated';
  }

  return `Updated ${date.toLocaleDateString()}`;
}

// Opens one conversation from the server-backed list.
function ConversationRow({ conversation }: { conversation: Conversation }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel="Open conversation"
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/conversations/[conversationId]',
          params: { conversationId: conversation.id },
        })
      }
      style={({ pressed }) => [styles.conversationRow, pressed && styles.conversationRowPressed]}>
      <Text numberOfLines={1} style={styles.conversationTitle}>
        Conversation
      </Text>
      <Text style={styles.conversationDate}>{formatUpdatedAt(conversation.updatedAt)}</Text>
    </Pressable>
  );
}

// Shows the current user's conversations and their fetch states.
export default function ConversationListScreen() {
  const router = useRouter();
  const { data: conversations, error, isError, isPending, isRefetching, refetch } = useConversations();
  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Keep the first load separate from refreshes so the list does not flash.
  if (isPending) {
    return (
      <View accessibilityLabel="Loading conversations" style={styles.centeredScreen}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Offer a safe retry without exposing API error content.
  if (isError) {
    const requestId = isApiClientError(error) ? error.requestId : null;

    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorTitle}>We couldn’t load your conversations.</Text>
        <Text style={styles.errorMessage}>Check your connection and try again.</Text>
        {requestId && <Text style={styles.requestId}>Request ID: {String(requestId)}</Text>}
        <Pressable
          accessibilityRole="button"
          onPress={refresh}
          style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  // FlatList retains efficient rendering for a growing conversation history.
  return (
    <FlatList
      contentContainerStyle={conversations?.length ? styles.listContent : styles.emptyListContent}
      data={conversations}
      keyExtractor={({ id }) => id}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Start a conversation</Text>
          <Text style={styles.emptyMessage}>Your conversations will appear here.</Text>
        </View>
      }
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text style={styles.screenTitle}>Luni</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(app)/chat/new')}
            style={({ pressed }) => [styles.newChatButton, pressed && styles.conversationRowPressed]}>
            <Text style={styles.newChatButtonText}>New chat</Text>
          </Pressable>
        </View>
      }
      refreshControl={<RefreshControl onRefresh={refresh} refreshing={isRefetching} />}
      renderItem={({ item }) => <ConversationRow conversation={item} />}
      style={styles.screen}
    />
  );
}

const styles = StyleSheet.create({
  buttonPressed: {
    opacity: 0.8,
  },
  centeredScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  conversationDate: {
    color: '#667085',
    fontSize: 14,
    marginTop: 6,
  },
  conversationRow: {
    borderBottomColor: '#EAECF0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
  },
  conversationRowPressed: {
    opacity: 0.7,
  },
  conversationTitle: {
    color: '#101828',
    fontSize: 17,
    fontWeight: '600',
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyMessage: {
    color: '#667085',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 96,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#101828',
    fontSize: 22,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#667085',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 32,
  },
  newChatButton: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newChatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  requestId: {
    color: '#667085',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  screen: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  screenTitle: {
    color: '#101828',
    fontSize: 30,
    fontWeight: '700',
  },
});
