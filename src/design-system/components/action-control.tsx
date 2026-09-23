import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { useTheme, type Theme } from '../theme';

export type ButtonVariant = 'primary' | 'outlined' | 'destructive';
export type ActionControlProps = Omit<PressableProps, 'children'> & {
  variant?: ButtonVariant;
  loading?: boolean;
  iconOnly?: boolean;
  children: (color: string) => ReactNode;
};

// Internal shared interaction layer for text and icon buttons.
export function ActionControl({
  variant = 'primary', loading = false, disabled = false, iconOnly = false,
  children, style, accessibilityState, onFocus, onBlur, onHoverIn, onHoverOut,
  ...props
}: ActionControlProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const unavailable = disabled || loading || accessibilityState?.disabled === true;
  const color = unavailable ? theme.colors.textMuted
    : variant === 'primary' ? theme.colors.onPrimary
    : variant === 'destructive' ? theme.colors.danger : theme.colors.text;

  return (
    <Pressable
      {...props}
      accessible
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: unavailable, busy: loading }}
      aria-disabled={unavailable}
      aria-busy={loading}
      disabled={unavailable}
      onFocus={event => { setFocused(true); onFocus?.(event); }}
      onBlur={event => { setFocused(false); onBlur?.(event); }}
      onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
      onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
      style={state => [
        styles.base, styles[variant], iconOnly && styles.iconOnly,
        typeof style === 'function' ? style(state) : style,
        unavailable && styles.disabled,
        !unavailable && (state.pressed || hovered) && styles.active,
        focused && !unavailable && styles.focused,
      ]}>
      <View aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.content}>
        {loading && <ActivityIndicator size="small" color={color} accessible={false} />}
        {(!iconOnly || !loading) && children(color)}
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  base: {
    minHeight: theme.sizing.minimumTouchTarget,
    minWidth: theme.sizing.minimumTouchTarget,
    borderWidth: 1,
    borderRadius: theme.radii.pill,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  outlined: { backgroundColor: 'transparent', borderColor: theme.colors.controlBorder },
  destructive: { backgroundColor: 'transparent', borderColor: theme.colors.danger },
  iconOnly: { width: theme.sizing.minimumTouchTarget, paddingHorizontal: 10 },
  content: { pointerEvents: 'none', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, maxWidth: '100%' },
  disabled: { backgroundColor: theme.colors.surface, borderColor: theme.colors.controlBorder },
  active: { opacity: 0.85 },
  focused: { outlineWidth: 2, outlineColor: theme.colors.focus, outlineOffset: 3, outlineStyle: 'solid' },
});
