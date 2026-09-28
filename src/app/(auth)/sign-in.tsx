import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, TextField } from '@/design-system/components';
import { useTheme, type Theme } from '@/design-system/theme';
import { AuthScreen } from '@/features/auth/auth-screen';
import { getAuthErrorMessage } from '@/features/auth/errors';
import { authRoutes } from '@/features/auth/routes';
import { signInSchema, type SignInFormValues } from '@/lib/validation/auth';
import { useAuth } from '@/providers/auth-provider';

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithPassword } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const passwordRef = useRef<TextInput>(null);
  const {
    control,
    clearErrors,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<SignInFormValues>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      await signInWithPassword({ email, password });
    } catch (error) {
      setError('root', { message: getAuthErrorMessage('sign-in', error) });
    }
  });
  const backToWelcome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(authRoutes.welcome);
  }, [router]);

  return (
    <AuthScreen
      onBack={backToWelcome}
      subtitle="Return to your conversation with Luni."
      title="Welcome back">
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
              textContentType="username"
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
              autoComplete="current-password"
              disabled={isSubmitting}
              errorText={errors.password?.message}
              label="Password"
              onBlur={onBlur}
              onChangeText={value => {
                clearErrors('root');
                onChange(value);
              }}
              onSubmitEditing={onSubmit}
              placeholder="Your password"
              returnKeyType="done"
              secureTextEntry
              textContentType="password"
              value={value}
            />
          )}
        />

        {errors.root?.message && (
          <Text accessibilityLiveRegion="polite" style={styles.formError}>
            {errors.root.message}
          </Text>
        )}

        <Button loading={isSubmitting} loadingLabel="Signing in…" onPress={onSubmit}>
          Sign in
        </Button>
      </View>

      <View style={styles.alternate}>
        <Text style={styles.alternateText}>New to Luni?</Text>
        <Button onPress={() => router.replace(authRoutes.signUp)} variant="outlined">
          Create account
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
});
