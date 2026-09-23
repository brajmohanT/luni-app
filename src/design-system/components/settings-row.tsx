import { useMemo, useState } from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type Theme } from '../theme';
import { Switch } from './switch';

type BaseProps = {
  label: string;
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export type SettingsRowProps = BaseProps & (
  | { kind: 'navigation'; value?: string; onPress: () => void }
  | { kind: 'toggle'; value: boolean; onValueChange: (value: boolean) => void }
  | { kind: 'info'; value: string }
);

export function SettingsRow(props: SettingsRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { label, description, disabled = false, style, testID } = props;
  const text = (
    <View style={styles.copy}>
      <Text style={[styles.label, disabled && styles.muted]}>{label}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );

  if (props.kind === 'toggle') {
    return (
      <View style={[styles.row, style]} testID={testID}>
        {text}
        <Switch value={props.value} onValueChange={props.onValueChange} disabled={disabled}
          accessibilityLabel={label} accessibilityHint={description} />
      </View>
    );
  }

  const content = <>
    {text}
    <View style={styles.trailing}>
      {props.value && <Text style={styles.value}>{props.value}</Text>}
      {props.kind === 'navigation' && <View aria-hidden accessible={false} style={styles.chevron} />}
    </View>
  </>;

  if (props.kind === 'info') return <View style={[styles.row, style]} testID={testID}>{content}</View>;

  return (
    <Pressable testID={testID} accessibilityRole="button" accessible
      accessibilityLabel={[label, props.value, description].filter(Boolean).join(', ')}
      accessibilityState={{ disabled }} aria-disabled={disabled} disabled={disabled}
      onPress={props.onPress}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [styles.row, style, !disabled && (pressed || hovered) && styles.active, focused && !disabled && styles.focused]}>
      {content}
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, minHeight: theme.sizing.settingsRowMinHeight, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.settingsBorder },
  copy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  label: { ...theme.typography.body, color: theme.colors.text },
  description: { ...theme.typography.caption, color: theme.colors.textMuted },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '45%', flexShrink: 1 },
  value: { ...theme.typography.secondary, color: theme.colors.textMuted, flexShrink: 1, textAlign: 'right' },
  muted: { color: theme.colors.textMuted },
  chevron: { width: 7, height: 7, marginHorizontal: 3, borderTopWidth: 1.8, borderRightWidth: 1.8, borderColor: theme.colors.textMuted, transform: [{ rotate: I18nManager.isRTL ? '-135deg' : '45deg' }] },
  active: { backgroundColor: theme.colors.composer },
  focused: { outlineColor: theme.colors.focus, outlineWidth: 2, outlineOffset: 3, outlineStyle: 'solid' },
});
