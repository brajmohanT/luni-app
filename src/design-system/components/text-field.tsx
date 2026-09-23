import { forwardRef, useId, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme, type Theme } from '../theme';

export type TextFieldProps = TextInputProps & {
  label: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({
  label, helperText, errorText, disabled = false, containerStyle, style,
  nativeID, accessibilityLabel, accessibilityHint, accessibilityState,
  onFocus, onBlur, editable, readOnly, ...props
}, forwardedRef) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const generatedId = useId();
  const id = nativeID ?? `luni-field-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const message = errorText || helperText;
  const unavailable = disabled || accessibilityState?.disabled === true;
  const hint = [message, accessibilityHint].filter(Boolean).join('. ') || undefined;
  const webAccessibility = Platform.OS === 'web' ? {
    'aria-invalid': Boolean(errorText),
    'aria-describedby': message ? `${id}-message` : undefined,
  } : {};

  return (
    <View style={[styles.container, containerStyle]}>
      <Text nativeID={`${id}-label`} style={styles.label} onPress={() => {
        if (!unavailable) inputRef.current?.focus();
      }}>{label}</Text>
      <TextInput
        {...props}
        {...webAccessibility}
        ref={instance => {
          inputRef.current = instance;
          if (typeof forwardedRef === 'function') forwardedRef(instance);
          else if (forwardedRef) forwardedRef.current = instance;
        }}
        nativeID={id}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={Platform.OS === 'web' ? accessibilityHint : hint}
        accessibilityState={{ ...accessibilityState, disabled: unavailable }}
        aria-disabled={unavailable}
        editable={unavailable ? false : editable}
        readOnly={unavailable || readOnly}
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.focus}
        underlineColorAndroid="transparent"
        onFocus={event => { setFocused(true); onFocus?.(event); }}
        onBlur={event => { setFocused(false); onBlur?.(event); }}
        style={[
          styles.input, style,
          unavailable && styles.disabled,
          Boolean(errorText) && styles.errorBorder,
          focused && !unavailable && styles.focused,
        ]}
      />
      {message && <Text
        nativeID={`${id}-message`}
        accessibilityLiveRegion={errorText ? 'polite' : 'none'}
        style={[styles.help, Boolean(errorText) && styles.errorText]}>{message}</Text>}
    </View>
  );
});

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { gap: theme.spacing.sm },
  label: { ...theme.typography.label, color: theme.colors.text },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.composer,
    borderColor: theme.colors.controlBorder,
    borderWidth: 1,
    borderRadius: theme.radii.input,
    minHeight: theme.sizing.inputMinHeight,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 14,
  },
  disabled: { color: theme.colors.textMuted },
  focused: { outlineWidth: 2, outlineOffset: 3, outlineColor: theme.colors.focus, outlineStyle: 'solid' },
  errorBorder: { borderColor: theme.colors.danger },
  help: { ...theme.typography.caption, color: theme.colors.textMuted },
  errorText: { color: theme.colors.danger },
});
