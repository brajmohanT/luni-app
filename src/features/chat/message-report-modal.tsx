import { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, TextField } from '@/design-system/components';
import { type Theme, useTheme } from '@/design-system/theme';
import type { MessageReportReason } from '@/lib/api/types';

const reasonOptions: readonly { label: string; value: MessageReportReason }[] = [
  { label: 'Unsafe or dangerous', value: 'unsafe_content' },
  { label: 'Sexual content', value: 'sexual_content' },
  { label: 'Hate or harassment', value: 'hate_or_harassment' },
  { label: 'Self-harm content', value: 'self_harm' },
  { label: 'Privacy concern', value: 'privacy' },
  { label: 'Something else', value: 'other' },
];

export type MessageReportModalProps = {
  visible: boolean;
  reason: MessageReportReason | null;
  details: string;
  isSubmitting: boolean;
  isSubmitted: boolean;
  canRetry: boolean;
  errorMessage: string | null;
  validationError: string | null;
  onChangeReason(reason: MessageReportReason): void;
  onChangeDetails(details: string): void;
  onSubmit(): void;
  onRetry(): void;
  onClose(): void;
};

export function MessageReportModal({
  visible,
  reason,
  details,
  isSubmitting,
  isSubmitted,
  canRetry,
  errorMessage,
  validationError,
  onChangeReason,
  onChangeDetails,
  onSubmit,
  onRetry,
  onClose,
}: MessageReportModalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const titleRef = useRef<Text | null>(null);
  const locked = isSubmitting || Boolean(errorMessage) || isSubmitted;

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => {
      const title = findNodeHandle(titleRef.current);
      if (title) AccessibilityInfo.setAccessibilityFocus(title);
    });
    return () => cancelAnimationFrame(frame);
  }, [isSubmitted, visible]);

  const close = () => {
    if (!isSubmitting) onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          {isSubmitted ? (
            <View style={styles.successContent}>
              <Text
                accessibilityLiveRegion="polite"
                accessibilityRole="header"
                ref={titleRef}
                style={styles.title}>
                Report sent
              </Text>
              <Text style={styles.description}>
                Thank you for helping us keep Luni safe.
              </Text>
              <Button onPress={onClose}>Close</Button>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.heading}>
                <Text accessibilityRole="header" ref={titleRef} style={styles.title}>
                  Report this response
                </Text>
                <Text style={styles.description}>
                  Tell us why this response felt unsafe or inappropriate.
                </Text>
              </View>

              <View accessibilityRole="radiogroup" style={styles.reasons}>
                <Text style={styles.sectionLabel}>Reason</Text>
                {reasonOptions.map(option => {
                  const selected = reason === option.value;
                  return (
                    <Pressable
                      accessibilityLabel={option.label}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected, disabled: locked }}
                      disabled={locked}
                      key={option.value}
                      onPress={() => onChangeReason(option.value)}
                      style={({ pressed }) => [
                        styles.reason,
                        selected && styles.reasonSelected,
                        pressed && !locked && styles.reasonPressed,
                        locked && styles.disabled,
                      ]}>
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.reasonLabel}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextField
                accessibilityHint="Optional context for the safety review"
                containerStyle={styles.details}
                disabled={locked}
                errorText={validationError ?? undefined}
                helperText={validationError ? undefined : `${details.length}/1,000 characters`}
                label="Additional details (optional)"
                maxLength={1000}
                multiline
                numberOfLines={4}
                onChangeText={onChangeDetails}
                style={styles.detailsInput}
                textAlignVertical="top"
                value={details}
              />

              {errorMessage && (
                <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error}>
                  {errorMessage}
                </Text>
              )}

              <View style={styles.actions}>
                <Button disabled={isSubmitting} onPress={close} variant="outlined">
                  Cancel
                </Button>
                {errorMessage && canRetry ? (
                  <Button disabled={isSubmitting} loading={isSubmitting} loadingLabel="Retrying…" onPress={onRetry}>
                    Retry
                  </Button>
                ) : !errorMessage ? (
                  <Button
                    disabled={!reason || isSubmitting}
                    loading={isSubmitting}
                    loadingLabel="Submitting…"
                    onPress={onSubmit}>
                    Submit report
                  </Button>
                ) : null}
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: theme.colors.scrim,
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  dialog: {
    backgroundColor: theme.colors.canvas,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.dialog,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '90%',
    maxWidth: 520,
    overflow: 'hidden',
    width: '100%',
  },
  content: { gap: theme.spacing.xl, padding: theme.spacing.xxl },
  successContent: { gap: theme.spacing.xl, padding: theme.spacing.xxl },
  heading: { gap: theme.spacing.sm },
  title: { ...theme.typography.dialogTitle, color: theme.colors.text },
  description: { ...theme.typography.body, color: theme.colors.textMuted },
  sectionLabel: { ...theme.typography.label, color: theme.colors.text },
  reasons: { gap: theme.spacing.sm },
  reason: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: theme.sizing.minimumTouchTarget,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  reasonSelected: { borderColor: theme.colors.primary },
  reasonPressed: { backgroundColor: theme.colors.composer },
  disabled: { opacity: 0.6 },
  radio: {
    alignItems: 'center',
    borderColor: theme.colors.controlBorder,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioSelected: { borderColor: theme.colors.primary },
  radioDot: {
    backgroundColor: theme.colors.primary,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  reasonLabel: { ...theme.typography.body, color: theme.colors.text, flex: 1 },
  details: { gap: theme.spacing.sm },
  detailsInput: { minHeight: 112 },
  error: { ...theme.typography.secondary, color: theme.colors.danger },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, justifyContent: 'flex-end' },
});
