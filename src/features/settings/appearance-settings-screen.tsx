import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design-system/components';
import { type Theme, type ThemePreference, useTheme } from '@/design-system/theme';
import { SettingsSaveController } from '@/features/settings/save-controller';
import { SettingsScreen } from '@/features/settings/settings-screen';
import { SettingsRadioRow } from '@/features/settings/settings-radio-row';

const appearanceOptions = [
  { value: 'system', label: 'System', description: 'Match your phone’s appearance.' },
  { value: 'light', label: 'Light', description: 'Use the light appearance.' },
  { value: 'dark', label: 'Dark', description: 'Use the dark appearance.' },
] as const satisfies readonly {
  value: ThemePreference;
  label: string;
  description: string;
}[];

export function AppearanceSettingsScreen({ onClose }: { onClose(): void }) {
  const { theme, preference, setPreference } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editedPreference, setEditedPreference] = useState<ThemePreference | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveController] = useState(() => new SettingsSaveController());
  const selectedPreference = editedPreference ?? preference;
  const edited = editedPreference !== null && editedPreference !== preference;

  useEffect(() => () => saveController.cancel(), [saveController]);

  const close = useCallback(() => {
    if (!saveController.isBusy()) onClose();
  }, [onClose, saveController]);

  const apply = async () => {
    if (!edited) return;
    setSaving(true);
    setSaveError(false);
    await saveController.run(
      () => setPreference(selectedPreference),
      () => {
        setSaving(false);
        onClose();
      },
      () => {
        setSaving(false);
        setSaveError(true);
      },
    );
  };

  return (
    <SettingsScreen
      backDisabled={saving}
      backLabel="Back to settings"
      onBack={close}
      subtitle="Choose the look you prefer. System follows your phone’s current setting."
      title="Appearance">
      <View accessibilityLabel="Appearance" accessibilityRole="radiogroup">
        {appearanceOptions.map(option => (
          <SettingsRadioRow
            key={option.value}
            label={option.label}
            description={option.description}
            selected={selectedPreference === option.value}
            disabled={saving}
            onPress={() => {
              setEditedPreference(option.value === preference ? null : option.value);
              setSaveError(false);
            }}
          />
        ))}
      </View>

      <View style={styles.actions}>
        {saveError && (
          <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.errorText}>
            We couldn’t save your appearance. Try again.
          </Text>
        )}
        <Button
          disabled={!edited}
          loading={saving}
          loadingLabel="Applying…"
          onPress={() => { void apply(); }}>
          {saveError ? 'Try again' : 'Apply appearance'}
        </Button>
      </View>
    </SettingsScreen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  actions: { gap: theme.spacing.lg, marginTop: theme.spacing.xxl },
  errorText: { ...theme.typography.secondary, color: theme.colors.danger },
});
