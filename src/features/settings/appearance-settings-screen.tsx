import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design-system/components';
import { type Theme, type ThemePreference, useTheme } from '@/design-system/theme';
import { SettingsSaveController } from '@/features/settings/save-controller';
import { SettingsScreen } from '@/features/settings/settings-screen';

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
  const [focusedPreference, setFocusedPreference] = useState<ThemePreference | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveController] = useState(() => new SettingsSaveController());
  const selectedPreference = editedPreference ?? preference;
  const edited = editedPreference !== null && editedPreference !== preference;

  useEffect(() => () => saveController.cancel(), [saveController]);

  const close = useCallback(() => {
    if (!saveController.isBusy()) onClose();
  }, [onClose, saveController]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close]));

  const apply = async () => {
    if (!edited) return;
    setSaving(true);
    setSaveError(false);
    try {
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
    } catch {
      // The controller publishes a persistence error only while this screen is mounted.
    }
  };

  return (
    <SettingsScreen
      backDisabled={saving}
      backLabel="Back to settings"
      onBack={close}
      subtitle="Choose the look you prefer. System follows your phone’s current setting."
      title="Appearance">
      <View accessibilityLabel="Appearance" accessibilityRole="radiogroup">
        {appearanceOptions.map(option => {
          const selected = selectedPreference === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityHint={option.description}
              accessibilityLabel={option.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: saving }}
              disabled={saving}
              onBlur={() => setFocusedPreference(null)}
              onFocus={() => setFocusedPreference(option.value)}
              onPress={() => {
                setEditedPreference(option.value === preference ? null : option.value);
                setSaveError(false);
              }}
              style={({ pressed }) => [
                styles.option,
                pressed && !saving && styles.pressed,
                saving && styles.disabledOption,
                focusedPreference === option.value && styles.focused,
              ]}>
              <View
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
            </Pressable>
          );
        })}
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
  disabledOption: { opacity: 0.5 },
  errorText: { ...theme.typography.secondary, color: theme.colors.danger },
  focused: { outlineColor: theme.colors.focus, outlineOffset: 2, outlineStyle: 'solid', outlineWidth: 2 },
  option: {
    alignItems: 'center',
    borderBottomColor: theme.colors.settingsBorder,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: theme.sizing.settingsRowMinHeight,
    paddingVertical: theme.spacing.lg,
  },
  optionCopy: { flex: 1, gap: theme.spacing.xs, minWidth: 0 },
  optionDescription: { ...theme.typography.caption, color: theme.colors.textMuted },
  optionLabel: { ...theme.typography.body, color: theme.colors.text },
  pressed: { backgroundColor: theme.colors.composer },
  radio: {
    alignItems: 'center',
    borderColor: theme.colors.controlBorder,
    borderRadius: theme.radii.pill,
    borderWidth: 2,
    flexShrink: 0,
    height: theme.sizing.icon,
    justifyContent: 'center',
    width: theme.sizing.icon,
  },
  radioDot: {
    backgroundColor: theme.colors.focus,
    borderRadius: theme.radii.pill,
    height: 10,
    width: 10,
  },
  radioSelected: { borderColor: theme.colors.focus },
});
