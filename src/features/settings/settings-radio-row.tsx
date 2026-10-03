import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '@/design-system/theme';

type SettingsRadioRowProps = {
  label: string;
  description?: string;
  accessibilityHint?: string;
  selected: boolean;
  disabled: boolean;
  onPress(): void;
};

export function SettingsRadioRow({
  label, description, accessibilityHint, selected, disabled, onPress,
}: SettingsRadioRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityHint={accessibilityHint ?? description}
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        focused && styles.focused,
      ]}>
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  disabled: { opacity: 0.5 },
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
  copy: { flex: 1, gap: theme.spacing.xs, minWidth: 0 },
  description: { ...theme.typography.caption, color: theme.colors.textMuted },
  label: { ...theme.typography.body, color: theme.colors.text },
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
