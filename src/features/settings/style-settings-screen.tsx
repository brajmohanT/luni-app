import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design-system/components';
import { type Theme, useTheme } from '@/design-system/theme';
import { useUpdateMyProfile } from '@/features/profile/hooks';
import { SettingsSaveController } from '@/features/settings/save-controller';
import { SettingsScreen } from '@/features/settings/settings-screen';
import { SettingsRadioRow } from '@/features/settings/settings-radio-row';
import { styleLabels } from '@/features/settings/values';
import { isApiClientError } from '@/lib/api/errors';
import type { ConversationStyle, Profile } from '@/lib/api/types';

const styleOptions = [
  {
    value: 'warm_balanced',
    sample: 'Nice work. How does it feel to have it finished?',
  },
  {
    value: 'gentle_reassuring',
    sample: 'You got through it. I hope you get a chance to rest now.',
  },
  {
    value: 'playful_casual',
    sample: 'Project finished! What’s the plan for your evening?',
  },
  {
    value: 'direct_thoughtful',
    sample: 'Nice work getting it done. What helped you finish?',
  },
] as const satisfies readonly { value: ConversationStyle; sample: string }[];

function saveErrorMessage(error: unknown) {
  if (isApiClientError(error) && error.code === 'VALIDATION_ERROR') {
    return 'Choose a conversation style and try again.';
  }
  if (isApiClientError(error) && ['MISSING_SESSION', 'MISSING_ACCESS_TOKEN', 'INVALID_ACCESS_TOKEN'].includes(error.code)) {
    return 'Your session needs refreshing. Sign in again before saving your style.';
  }
  if (isApiClientError(error) && error.code === 'EMAIL_NOT_CONFIRMED') {
    return 'Confirm your email before saving your style.';
  }
  return 'We couldn’t save your conversation style. Check your connection and try again.';
}

export function StyleSettingsScreen({ profile, onClose }: { profile: Profile; onClose(): void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const updateProfile = useUpdateMyProfile();
  const [editedStyle, setEditedStyle] = useState<ConversationStyle | null>(null);
  const [saveController] = useState(() => new SettingsSaveController());
  const selectedStyle = editedStyle ?? profile.conversationStyle;
  const edited = editedStyle !== null && editedStyle !== profile.conversationStyle;
  const selectedOption = styleOptions.find(option => option.value === selectedStyle);

  useEffect(() => () => saveController.cancel(), [saveController]);

  const close = useCallback(() => {
    if (!saveController.isBusy()) onClose();
  }, [onClose, saveController]);

  const save = async () => {
    if (!edited) return;
    await saveController.run(
      () => updateProfile.mutateAsync({ conversationStyle: selectedStyle }),
      onClose,
    );
  };

  return (
    <SettingsScreen
      backDisabled={updateProfile.isPending}
      backLabel="Back to settings"
      onBack={close}
      subtitle="Choose how Luni talks with you. Changes apply to future replies."
      title="Conversation style">
      <View accessibilityLabel="Conversation style" accessibilityRole="radiogroup">
        {styleOptions.map(option => (
          <SettingsRadioRow
            key={option.value}
            accessibilityHint={option.sample}
            label={styleLabels[option.value]}
            selected={selectedStyle === option.value}
            disabled={updateProfile.isPending}
            onPress={() => {
              setEditedStyle(option.value === profile.conversationStyle ? null : option.value);
              updateProfile.reset();
            }}
          />
        ))}
      </View>

      <View style={styles.sample}>
        <Text style={styles.sampleLabel}>You: “I finished my project.”</Text>
        <Text accessibilityLiveRegion="polite" style={styles.sampleText}>{selectedOption?.sample}</Text>
      </View>

      <View style={styles.actions}>
        {updateProfile.isError && (
          <View accessibilityLiveRegion="polite" style={styles.errorBlock}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {saveErrorMessage(updateProfile.error)}
            </Text>
            {isApiClientError(updateProfile.error) && updateProfile.error.requestId && (
              <Text selectable style={styles.requestId}>Request ID: {updateProfile.error.requestId}</Text>
            )}
          </View>
        )}
        <Button
          disabled={!edited}
          loading={updateProfile.isPending}
          loadingLabel="Saving…"
          onPress={() => { void save(); }}>
          {updateProfile.isError ? 'Try again' : 'Save style'}
        </Button>
      </View>
    </SettingsScreen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  actions: { gap: theme.spacing.lg, marginTop: theme.spacing.xxl },
  errorBlock: { gap: theme.spacing.xs },
  errorText: { ...theme.typography.secondary, color: theme.colors.danger },
  requestId: { ...theme.typography.caption, color: theme.colors.textMuted },
  sample: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.message,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xxl,
    padding: theme.spacing.lg,
  },
  sampleLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
  sampleText: { ...theme.typography.message, color: theme.colors.text },
});
