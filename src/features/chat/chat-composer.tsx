import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type ChatComposerProps = {
  autoFocus?: boolean;
  draft: string;
  errorMessage: string | null;
  hasFailedSend: boolean;
  isSending: boolean;
  onChangeDraft(value: string): void;
  onRetry(): void;
  onSend(): void;
  requestId: string | null;
  validationError: string | null;
};

// Renders the reusable input and send controls for a chat message.
export function ChatComposer({
  autoFocus = false,
  draft,
  errorMessage,
  hasFailedSend,
  isSending,
  onChangeDraft,
  onRetry,
  onSend,
  requestId,
  validationError,
}: ChatComposerProps) {
  const message = validationError ?? errorMessage;

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Message"
        autoFocus={autoFocus}
        editable={!isSending}
        maxLength={4000}
        multiline
        onChangeText={onChangeDraft}
        placeholder="Write a message"
        style={styles.input}
        textAlignVertical="top"
        value={draft}
      />
      <Text style={styles.characterCount}>{draft.length}/4000</Text>

      {message && <Text style={styles.errorMessage}>{message}</Text>}
      {requestId && <Text style={styles.requestId}>Request ID: {requestId}</Text>}

      {hasFailedSend ? (
        <Pressable
          accessibilityRole="button"
          disabled={isSending}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.sendButton,
            isSending && styles.sendButtonDisabled,
            pressed && !isSending && styles.buttonPressed,
          ]}>
          <Text style={styles.sendButtonText}>Retry</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={isSending}
          onPress={onSend}
          style={({ pressed }) => [
            styles.sendButton,
            isSending && styles.sendButtonDisabled,
            pressed && !isSending && styles.buttonPressed,
          ]}>
          <Text style={styles.sendButtonText}>{isSending ? 'Sending…' : 'Send'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonPressed: {
    opacity: 0.8,
  },
  characterCount: {
    alignSelf: 'flex-end',
    color: '#667085',
    fontSize: 12,
    marginTop: 6,
  },
  container: {
    padding: 20,
  },
  errorMessage: {
    color: '#B42318',
    fontSize: 14,
    marginTop: 14,
  },
  input: {
    borderColor: '#98A2B3',
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 23,
    minHeight: 104,
    padding: 14,
  },
  requestId: {
    color: '#667085',
    fontSize: 12,
    marginTop: 8,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#208AEF',
    borderRadius: 10,
    marginTop: 20,
    paddingVertical: 14,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
