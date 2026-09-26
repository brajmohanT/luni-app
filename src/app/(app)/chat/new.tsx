import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChatComposer } from '@/features/chat/chat-composer';
import { useChatComposer } from '@/features/chat/use-chat-composer';
import type { ChatResponse } from '@/lib/api/types';

// Creates a conversation from the first message, then opens it.
export default function NewChatScreen() {
  const router = useRouter();
  const openConversation = useCallback(
    (response: ChatResponse) => {
      router.replace({
        pathname: '/conversations/[conversationId]',
        params: { conversationId: response.conversationId },
      });
    },
    [router],
  );
  const composer = useChatComposer({ onSuccess: openConversation });

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
        <Text style={styles.title}>New chat</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.prompt}>What would you like to talk about?</Text>
      </View>

      <ChatComposer {...composer}
        autoFocus
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  prompt: {
    color: '#101828',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  screen: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  title: {
    color: '#101828',
    fontSize: 17,
    fontWeight: '700',
  },
});
