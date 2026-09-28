import { useMemo, useState, type RefObject } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button, IconButton, TextField } from '@/design-system/components';
import { type Theme, useTheme } from '@/design-system/theme';
import type { RecoveryAction } from '@/features/chat/send-controller';
import type { ReplyTarget } from '@/lib/api/types';

const composerMinHeight = 44;
const composerMaxHeight = 132;

type ChatComposerProps = {
  autoFocus?: boolean;
  draft: string;
  errorMessage: string | null;
  notice: string | null;
  hasFailedSend: boolean;
  isSending: boolean;
  inputRef?: RefObject<TextInput | null>;
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

function CloseIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg accessible={false} height={size} viewBox="0 0 24 24" width={size}>
      <Path d="m6 6 12 12M18 6 6 18" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
    </Svg>
  );
}

function SendIcon({ color }: { color: string }) {
  return (
    <Svg accessible={false} height={21} viewBox="0 0 24 24" width={21}>
      <Path d="M3 2l19 10L3 22l3-9 10-1-10-1z" fill={color} />
    </Svg>
  );
}

function PasswordRecovery({ email, disabled, recover }: {
  email: string;
  disabled: boolean;
  recover(password?: string): Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
  inputRef, onChangeDraft, onRetry, onSend, recover, editAsNew, selectReply, requestId, validationError, accountEmail,
}: ChatComposerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [inputHeight, setInputHeight] = useState(composerMinHeight);
  const [focused, setFocused] = useState(false);
  const [sendFocused, setSendFocused] = useState(false);
  const message = validationError ?? errorMessage;
  const sendDisabled = isSending || !draft.trim() || retrySeconds > 0;
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
        <View style={styles.replyPreview}>
          <View style={styles.replyText}>
            <Text style={styles.replyLabel}>Replying to Luni</Text>
            <Text numberOfLines={2} style={styles.replyContent}>{replyTarget.content}</Text>
          </View>
          {isEditable && (
            <IconButton
              accessibilityLabel="Cancel reply"
              icon={CloseIcon}
              onPress={() => selectReply(null)}
              style={styles.dismissReply}
            />
          )}
        </View>
      )}
      <View style={[styles.composer, focused && styles.composerFocused]}>
        <TextInput
          accessibilityHint={!isEditable ? 'Resolve the pending send or choose Edit as new message to change this text.' : undefined}
          accessibilityLabel="Message Luni"
          autoFocus={autoFocus}
          editable={isEditable}
          maxLength={4000}
          multiline
          onBlur={() => setFocused(false)}
          onChangeText={onChangeDraft}
          onContentSizeChange={({ nativeEvent }) => {
            setInputHeight(Math.min(composerMaxHeight, Math.max(composerMinHeight, nativeEvent.contentSize.height)));
          }}
          onFocus={() => setFocused(true)}
          placeholder="Message Luni…"
          placeholderTextColor={theme.colors.textMuted}
          ref={inputRef}
          scrollEnabled={inputHeight >= composerMaxHeight}
          selectionColor={theme.colors.focus}
          style={[styles.input, { height: inputHeight }]}
          textAlignVertical="top"
          value={draft}
        />
        <Pressable
          accessibilityLabel={isSending ? 'Sending message' : retrySeconds > 0 ? `Send available in ${retrySeconds} seconds` : 'Send message'}
          accessibilityRole="button"
          accessibilityState={{ busy: isSending, disabled: sendDisabled }}
          disabled={sendDisabled}
          onBlur={() => setSendFocused(false)}
          onFocus={() => setSendFocused(true)}
          onPress={onSend}
          style={({ pressed }) => [
            styles.send,
            sendDisabled && styles.sendDisabled,
            pressed && !sendDisabled && styles.sendPressed,
            sendFocused && !sendDisabled && styles.sendFocused,
          ]}>
          {isSending
            ? <ActivityIndicator color={theme.colors.canvas} size="small" />
            : <SendIcon color={sendDisabled ? theme.colors.textMuted : theme.colors.canvas} />}
        </Pressable>
      </View>
      {draft.length >= 3600 && <Text style={styles.characterCount}>{4000 - draft.length} characters left</Text>}
      {!hasFailedSend && retrySeconds > 0 && (
        <Text accessibilityLiveRegion="polite" style={styles.statusText}>You can send in {retrySeconds}s.</Text>
      )}
      {message && <Text accessibilityLiveRegion="polite" style={styles.errorMessage}>{message}</Text>}
      {notice && <Text accessibilityLiveRegion="polite" style={styles.statusText}>{notice}</Text>}
      {requestId && <Text selectable style={styles.requestId}>Request ID: {requestId}</Text>}
      {hasFailedSend && (
        <View style={styles.recoveryPanel}>
          <View style={styles.actions}>
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
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.canvas,
    flexShrink: 0,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  replyPreview: {
    alignItems: 'center',
    backgroundColor: theme.colors.incomingBubble,
    borderRadius: theme.radii.message,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    minHeight: theme.sizing.minimumTouchTarget,
    paddingLeft: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  replyText: { flex: 1, minWidth: 0 },
  replyLabel: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '600' },
  replyContent: { ...theme.typography.caption, color: theme.colors.textMuted },
  dismissReply: { borderColor: 'transparent' },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: theme.colors.composer,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.composer,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  composerFocused: { borderColor: theme.colors.focus },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    maxHeight: composerMaxHeight,
    minHeight: composerMinHeight,
    paddingHorizontal: 0,
    paddingVertical: 10,
  },
  send: {
    alignItems: 'center',
    backgroundColor: theme.colors.text,
    borderRadius: theme.radii.pill,
    height: theme.sizing.minimumTouchTarget,
    justifyContent: 'center',
    width: theme.sizing.minimumTouchTarget,
  },
  sendDisabled: { backgroundColor: theme.colors.incomingBubble },
  sendPressed: { opacity: 0.78 },
  sendFocused: { outlineColor: theme.colors.focus, outlineOffset: 3, outlineStyle: 'solid', outlineWidth: 2 },
  characterCount: { ...theme.typography.caption, alignSelf: 'flex-end', color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  statusText: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
  errorMessage: { ...theme.typography.secondary, color: theme.colors.danger, marginTop: theme.spacing.sm },
  requestId: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
  recoveryPanel: { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: theme.spacing.md, paddingTop: theme.spacing.md },
  actions: { gap: theme.spacing.md },
});
