import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type Theme } from '../theme';

export type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Controlled switch using the approved 48 × 28 track and 44-point hit target. */
export function Switch({ value, onValueChange, accessibilityLabel, accessibilityHint, disabled = false, style, testID }: SwitchProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      testID={testID}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={() => { if (!disabled) onValueChange(!value); }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.target, style, pressed && !disabled && styles.pressed]}>
      <View aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.track, value && styles.on, disabled && styles.disabled, focused && !disabled && styles.focused]}>
        <View style={styles.thumb} />
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  target: { minWidth: 48, minHeight: theme.sizing.minimumTouchTarget, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', flexShrink: 0 },
  track: { width: 48, height: 28, padding: 3, borderRadius: theme.radii.pill, backgroundColor: theme.colors.controlBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', pointerEvents: 'none' },
  on: { backgroundColor: theme.colors.primary, justifyContent: 'flex-end' },
  thumb: { width: 22, height: 22, borderRadius: theme.radii.pill, backgroundColor: theme.colors.onPrimary },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  focused: { outlineColor: theme.colors.focus, outlineWidth: 2, outlineOffset: 4, outlineStyle: 'solid' },
});
