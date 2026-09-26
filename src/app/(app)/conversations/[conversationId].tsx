import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ChatComposer } from '@/features/chat/chat-composer';
import { useChatComposer } from '@/features/chat/use-chat-composer';
import { useConversationMessages } from '@/features/conversations/hooks';
import { isApiClientError } from '@/lib/api/errors';
import type { ChatResponse, Message } from '@/lib/api/types';

// Renders a message according to its server-provided role.
function MessageBubble({ message }: { message: Message }) {
  const isUserMessage = message.role === 'user';
  const isSystemMessage = message.role === 'system';

  return (
    <View
      style={[
        styles.messageBubble,
        isUserMessage && styles.userMessageBubble,
        isSystemMessage && styles.systemMessageBubble,
      ]}>
      <Text
        style={[
          styles.messageText,
          isUserMessage && styles.userMessageText,
          isSystemMessage && styles.systemMessageText,
        ]}>
        {message.content}
      </Text>
    </View>
  );
}

// Loads and displays the messages for the route's conversation ID.
export default function ConversationDetailScreen() {
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const conversationId =
    typeof params.conversationId === 'string' ? params.conversationId : undefined;
  const router = useRouter();
  const { data, error, isError, isPending, isRefetching, refetch } =
    useConversationMessages(conversationId);
  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);
  // Reloads the server-persisted messages after a successful send.
  const refreshAfterSend = useCallback(async (_response: ChatResponse) => {
    await refetch();
  }, [refetch]);
  const composer = useChatComposer({
    onSuccess: refreshAfterSend,
  });

  // Avoid a request when the route does not contain a usable ID.
  if (!conversationId) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorTitle}>This conversation is unavailable.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(app)')}
          style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}>
          <Text style={styles.actionButtonText}>Back to conversations</Text>
        </Pressable>
      </View>
    );
  }

  // Show a dedicated screen for the initial conversation load.
  if (isPending) {
    return (
      <View accessibilityLabel="Loading conversation" style={styles.centeredScreen}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // A missing conversation needs navigation; other failures can retry.
  if (isError) {
    const isMissingConversation = isApiClientError(error) && error.code === 'CONVERSATION_NOT_FOUND';
    const requestId = isApiClientError(error) ? error.requestId : null;

    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorTitle}>
          {isMissingConversation ? 'This conversation is unavailable.' : 'We couldn’t load this conversation.'}
        </Text>
        {!isMissingConversation && (
          <Text style={styles.errorMessage}>Check your connection and try again.</Text>
        )}
        {requestId && <Text style={styles.requestId}>Request ID: {requestId}</Text>}
        <Pressable
          accessibilityRole="button"
          onPress={isMissingConversation ? () => router.replace('/(app)') : refresh}
          style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}>
          <Text style={styles.actionButtonText}>
            {isMissingConversation ? 'Back to conversations' : 'Try again'}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  // Keep the header outside the list while messages refresh independently.
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to conversations"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          Conversation
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        contentContainerStyle={data.messages.length ? styles.messageList : styles.emptyList}
        data={data.messages}
        keyboardShouldPersistTaps="handled"
        keyExtractor={({ id }) => id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
          </View>
        }
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={isRefetching} />}
        renderItem={({ item }) => <MessageBubble message={item} />}
      />

      <ChatComposer
        draft={composer.draft}
        errorMessage={composer.errorMessage}
        hasFailedSend={composer.hasFailedSend}
        isSending={composer.isSending}
        onChangeDraft={composer.updateDraft}
        onRetry={composer.retrySend}
        onSend={composer.startSend}
        requestId={composer.requestId}
        validationError={composer.validationError}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#208AEF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  centeredScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#667085',
    fontSize: 16,
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
  header: {
    alignItems: 'center',
    borderBottomColor: '#EAECF0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    color: '#101828',
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  messageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F4F7',
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageList: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  messageText: {
    color: '#101828',
    fontSize: 16,
    lineHeight: 23,
  },
  requestId: {
    color: '#667085',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  screen: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  systemMessageBubble: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
  },
  systemMessageText: {
    color: '#667085',
    fontSize: 13,
    textAlign: 'center',
  },
  userMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#208AEF',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
});
