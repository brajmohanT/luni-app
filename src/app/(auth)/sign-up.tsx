import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, TextField } from '@/design-system/components';
import { useTheme, type Theme } from '@/design-system/theme';
import { AuthScreen } from '@/features/auth/auth-screen';
import { getAuthErrorMessage } from '@/features/auth/errors';
import { authRoutes } from '@/features/auth/routes';
import { signUpSchema, type SignUpFormValues } from '@/lib/validation/auth';
import { useAuth } from '@/providers/auth-provider';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUpWithPassword } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const {
    control,
    clearErrors,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
  } = useForm<SignUpFormValues>({
    defaultValues: { confirmPassword: '', email: '', password: '' },
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      const result = await signUpWithPassword({ email, password });
      if (result.requiresEmailConfirmation) setConfirmationEmail(email);
    } catch (error) {
      setError('root', { message: getAuthErrorMessage('sign-up', error) });
    }
  });
  const backToWelcome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(authRoutes.welcome);
  }, [router]);

  if (confirmationEmail) {
    return (
      <AuthScreen
        onBack={backToWelcome}
        subtitle="Confirm your account to continue."
        title="Check your email">
        <View style={styles.confirmation}>
          <Text style={styles.confirmationText}>We sent a confirmation link to:</Text>
          <Text selectable style={styles.confirmationEmail}>{confirmationEmail}</Text>
          <Text style={styles.confirmationText}>
            Open the link on this device, then return to Luni and sign in.
          </Text>
          <Button onPress={() => router.replace(authRoutes.signIn)}>Go to sign in</Button>
          <Button
            onPress={() => {
              setConfirmationEmail(null);
              reset({ confirmPassword: '', email: confirmationEmail, password: '' });
            }}
            variant="outlined">
            Use a different email
          </Button>
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      onBack={backToWelcome}
      subtitle="Create an account to start your conversation with Luni."
      title="Create your account">
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, ref, value } }) => (
            <TextField
              ref={ref}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              blurOnSubmit={false}
              disabled={isSubmitting}
              errorText={errors.email?.message}
              keyboardType="email-address"
              label="Email"
              onBlur={onBlur}
              onChangeText={value => {
                clearErrors('root');
                onChange(value);
              }}
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder="you@example.com"
              returnKeyType="next"
              textContentType="emailAddress"
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, ref, value } }) => (
            <TextField
              ref={instance => {
                passwordRef.current = instance;
                ref(instance);
              }}
              autoComplete="new-password"
              blurOnSubmit={false}
              disabled={isSubmitting}
              errorText={errors.password?.message}
              helperText="Use at least 6 characters."
              label="Password"
              onBlur={onBlur}
              onChangeText={value => {
                clearErrors('root');
                onChange(value);
              }}
              onSubmitEditing={() => confirmationRef.current?.focus()}
              placeholder="Create a password"
              returnKeyType="next"
              secureTextEntry
              textContentType="newPassword"
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onBlur, onChange, ref, value } }) => (
            <TextField
              ref={instance => {
                confirmationRef.current = instance;
                ref(instance);
              }}
              autoComplete="new-password"
              disabled={isSubmitting}
              errorText={errors.confirmPassword?.message}
              label="Confirm password"
              onBlur={onBlur}
              onChangeText={value => {
                clearErrors('root');
                onChange(value);
              }}
              onSubmitEditing={onSubmit}
              placeholder="Repeat your password"
              returnKeyType="done"
              secureTextEntry
              textContentType="newPassword"
              value={value}
            />
          )}
        />

        {errors.root?.message && (
          <Text accessibilityLiveRegion="polite" style={styles.formError}>
            {errors.root.message}
          </Text>
        )}

        <Button loading={isSubmitting} loadingLabel="Creating account…" onPress={onSubmit}>
          Create account
        </Button>
      </View>

      <View style={styles.alternate}>
        <Text style={styles.alternateText}>Already have an account?</Text>
        <Button onPress={() => router.replace(authRoutes.signIn)} variant="outlined">
          Sign in
        </Button>
      </View>
    </AuthScreen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  form: { gap: theme.spacing.xl },
  formError: { ...theme.typography.secondary, color: theme.colors.danger },
  alternate: { gap: theme.spacing.md, marginTop: theme.spacing.xxxl },
  alternateText: {
    ...theme.typography.secondary,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  confirmation: { gap: theme.spacing.xl },
  confirmationText: { ...theme.typography.body, color: theme.colors.textMuted },
  confirmationEmail: { ...theme.typography.heading, color: theme.colors.text },
});
