import { useCallback } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ChatComposer } from '@/features/chat/chat-composer';
import { useChatComposer } from '@/features/chat/use-chat-composer';
import { useCompanionMessages } from '@/features/conversations/hooks';
import { useTheme } from '@/design-system/theme';
import { EntryRecovery } from '@/features/auth/entry-recovery';
import { entryFailure } from '@/features/auth/entry-failure';
import { SessionLoadingScreen } from '@/features/auth/session-loading-screen';
import { useMyProfile } from '@/features/profile/hooks';
import { useAuth } from '@/providers/auth-provider';
import { useQueryClient } from '@tanstack/react-query';
import { conversationKeys } from '@/lib/queries/conversations';
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

// Render only server-persisted messages, including the first greeting.
export default function CompanionChatScreen() {
  const { data, error, isError, isPending, isRefetching, refetch } = useCompanionMessages();
  const { theme } = useTheme();
  const profile = useMyProfile();
  const client = useQueryClient();
  const { session } = useAuth();
  const recover = async () => {
    if (isApiClientError(error) && error.code === 'COMPANION_CONVERSATION_NOT_FOUND' && session) {
      await client.invalidateQueries({ queryKey: conversationKeys.companion(session.user.id), refetchType: 'none' });
    }
    if (entryFailure(error, 'chat').action === 'profile') {
      const result = await profile.refetch();
      if (result.error) throw result.error;
      if (!result.data?.onboardingCompletedAt) return;
    }
    await refetch();
  };
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

  if (isPending) return <SessionLoadingScreen message="Opening your conversation…" />;
  if (isError && (!data || entryFailure(error, 'chat').action !== 'retry')) {
    return <EntryRecovery error={error} target="chat" onRetry={recover} />;
  }

  if (!data) {
    return null;
  }

  // Keep the header outside the list while messages refresh independently.
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.colors.canvas }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.headerTitle}>Luni</Text>
      </View>

      {isError && <EntryRecovery error={error} target="chat" onRetry={recover} compact />}

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

      <ChatComposer {...composer}
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
