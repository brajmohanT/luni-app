import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/design-system/components/button';
import { TextField } from '@/design-system/components/text-field';
import type { RecoveryAction } from '@/features/chat/send-controller';
import type { ReplyTarget } from '@/lib/api/types';

type ChatComposerProps = {
  autoFocus?: boolean;
  draft: string;
  errorMessage: string | null;
  notice: string | null;
  hasFailedSend: boolean;
  isSending: boolean;
  isEditable: boolean;
  canRetry: boolean;
  retrySeconds: number;
  recoveryAction: RecoveryAction | null;
  uncertain: boolean;
  replyTarget: ReplyTarget | null;
  onChangeDraft(value: string): void;
  onRetry(): void;
  onSend(): void;
  recover(password?: string): Promise<void>;
  accountEmail: string | null;
  editAsNew(): void;
  selectReply(reply: ReplyTarget | null): void;
  requestId: string | null;
  validationError: string | null;
};

function PasswordRecovery({ email, disabled, recover }: {
  email: string;
  disabled: boolean;
  recover(password?: string): Promise<void>;
}) {
  const [password, setPassword] = useState('');
  return (
    <View style={styles.actions}>
      <Text style={styles.requestId}>Sign in again as {email}</Text>
      <TextField label="Password" value={password} onChangeText={setPassword}
        secureTextEntry autoCapitalize="none" autoCorrect={false}
        autoComplete="current-password" textContentType="password" disabled={disabled} />
      <Button disabled={disabled || !password} onPress={() => {
        const entered = password;
        setPassword('');
        void recover(entered);
      }}>Sign in and retry original</Button>
    </View>
  );
}

export function ChatComposer({
  autoFocus = false, draft, errorMessage, notice, hasFailedSend, isSending,
  isEditable, canRetry, retrySeconds, recoveryAction, uncertain, replyTarget,
  onChangeDraft, onRetry, onSend, recover, editAsNew, selectReply, requestId, validationError, accountEmail,
}: ChatComposerProps) {
  const message = validationError ?? errorMessage;
  const edit = () => {
    if (!uncertain) { editAsNew(); return; }
    Alert.alert('Edit as a new message?',
      'The original message may already be saved. Sending edited text creates a separate message. Retry the original to avoid sending it twice.',
      [{ text: 'Keep original', style: 'cancel' }, { text: 'Edit as new', onPress: editAsNew }]);
  };
  const recoveryLabel = recoveryAction === 'session' ? 'Check sign-in'
    : recoveryAction === 'verify' ? 'Check email verification' : 'Check setup';
  return (
    <View style={styles.container}>
      {replyTarget && (
        <View>
          <Text style={styles.characterCount}>Replying to Luni</Text>
          <Text numberOfLines={3}>{replyTarget.content}</Text>
          {isEditable && <Button variant="outlined" onPress={() => selectReply(null)}>Remove quote</Button>}
        </View>
      )}
      <TextInput
        accessibilityLabel="Message"
        accessibilityHint={!isEditable ? 'Resolve the pending send or choose Edit as new message to change this text.' : undefined}
        autoFocus={autoFocus}
        editable={isEditable}
        maxLength={4000}
        multiline
        onChangeText={onChangeDraft}
        placeholder="Write a message"
        style={styles.input}
        textAlignVertical="top"
        value={draft}
      />
      <Text style={styles.characterCount}>{draft.length}/4000</Text>
      {message && <Text accessibilityLiveRegion="polite" style={styles.errorMessage}>{message}</Text>}
      {notice && <Text accessibilityLiveRegion="polite" style={styles.requestId}>{notice}</Text>}
      {requestId && <Text selectable style={styles.requestId}>Request ID: {requestId}</Text>}
      <View style={styles.actions}>
        {hasFailedSend ? (
          <>
            {recoveryAction === 'retry' && (
              <Button disabled={!canRetry} onPress={onRetry}>
                {retrySeconds > 0 ? `Retry in ${retrySeconds}s` : 'Retry original message'}
              </Button>
            )}
            {['session', 'verify', 'onboarding'].includes(recoveryAction ?? '') && (
              <Button disabled={isSending || retrySeconds > 0} onPress={() => { void recover(); }} loading={isSending} loadingLabel="Checking…">
                {retrySeconds > 0 ? `${recoveryLabel} in ${retrySeconds}s` : recoveryLabel}
              </Button>
            )}
            {recoveryAction === 'session' && accountEmail && (
              <PasswordRecovery email={accountEmail} disabled={isSending || retrySeconds > 0} recover={recover} />
            )}
            <Button variant="outlined" disabled={isSending} onPress={edit}>
              {uncertain ? 'Edit as new message' : 'Edit message'}
            </Button>
          </>
        ) : (
          <Button disabled={isSending || !draft.trim() || retrySeconds > 0} onPress={onSend} loading={isSending} loadingLabel="Sending…">
            {retrySeconds > 0 ? `Send in ${retrySeconds}s` : 'Send'}
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12, marginTop: 20 },
  characterCount: { alignSelf: 'flex-end', color: '#667085', fontSize: 12, marginTop: 6 },
  container: { padding: 20 },
  errorMessage: { color: '#B42318', fontSize: 14, marginTop: 14 },
  input: { borderColor: '#98A2B3', borderRadius: 12, borderWidth: 1, fontSize: 16,
    lineHeight: 23, minHeight: 104, padding: 14 },
  requestId: { color: '#667085', fontSize: 12, marginTop: 8 },
});
