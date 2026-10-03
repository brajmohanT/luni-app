import { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/design-system/components';
import { type Theme, useTheme } from '@/design-system/theme';

type ConfirmationDialogProps = {
  cancelLabel: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'destructive';
  description: string;
  errorMessage?: string | null;
  errorRequestId?: string | null;
  loading: boolean;
  loadingLabel: string;
  title: string;
  visible: boolean;
  onCancel(): void;
  onConfirm(): void;
};

export function ConfirmationDialog({
  cancelLabel,
  confirmLabel,
  confirmVariant = 'primary',
  description,
  errorMessage,
  errorRequestId,
  loading,
  loadingLabel,
  title,
  visible,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const titleRef = useRef<Text | null>(null);

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => {
      const target = findNodeHandle(titleRef.current);
      if (target) AccessibilityInfo.setAccessibilityFocus(target);
    });
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  const cancel = () => {
    if (!loading) onCancel();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={cancel}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" ref={titleRef} style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
          {errorMessage && (
            <View accessibilityLiveRegion="polite" style={styles.errorBlock}>
              <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>
              {errorRequestId && (
                <Text selectable style={styles.requestId}>Request ID: {errorRequestId}</Text>
              )}
            </View>
          )}
          <View style={styles.actions}>
            <Button disabled={loading} onPress={cancel} variant="outlined">{cancelLabel}</Button>
            <Button loading={loading} loadingLabel={loadingLabel} onPress={onConfirm} variant={confirmVariant}>
              {errorMessage ? 'Try again' : confirmLabel}
            </Button>
          </View>
        </View>
      </View>
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
    gap: theme.spacing.xl,
    maxWidth: 480,
    padding: theme.spacing.xxl,
    width: '100%',
  },
  heading: { gap: theme.spacing.sm },
  title: { ...theme.typography.dialogTitle, color: theme.colors.text },
  description: { ...theme.typography.body, color: theme.colors.textMuted },
  errorBlock: { gap: theme.spacing.xs },
  error: { ...theme.typography.secondary, color: theme.colors.danger },
  requestId: { ...theme.typography.caption, color: theme.colors.textMuted },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'flex-end',
  },
});
