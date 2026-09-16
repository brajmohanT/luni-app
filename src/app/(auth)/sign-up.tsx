import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { signUpSchema, type SignUpFormValues } from '@/lib/validation/auth';
import { useAuth } from '@/providers/auth-provider';

export default function SignUpScreen() {
  const { signUpWithPassword } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<SignUpFormValues>({
    defaultValues: {
      confirmPassword: '',
      email: '',
      password: '',
    },
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setSuccessMessage(null);

    try {
      const result = await signUpWithPassword({ email, password });

      if (result.requiresEmailConfirmation) {
        setSuccessMessage('Check your email to confirm your account, then return to Luni to sign in.');
      }
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Unable to create your account. Please try again.',
      });
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Start your conversation with Luni.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="you@example.com"
              style={[styles.input, errors.email && styles.inputError]}
              textContentType="emailAddress"
              value={value}
            />
          )}
        />
        {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}

        <Text style={styles.label}>Password</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              autoComplete="new-password"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="At least 6 characters"
              secureTextEntry
              style={[styles.input, errors.password && styles.inputError]}
              textContentType="newPassword"
              value={value}
            />
          )}
        />
        {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}

        <Text style={styles.label}>Confirm password</Text>
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              autoComplete="new-password"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Repeat your password"
              secureTextEntry
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              textContentType="newPassword"
              value={value}
            />
          )}
        />
        {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>}

        {errors.root && <Text style={styles.submitError}>{errors.root.message}</Text>}
        {successMessage && <Text style={styles.successMessage}>{successMessage}</Text>}

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
            pressed && !isSubmitting && styles.submitButtonPressed,
          ]}>
          <Text style={styles.submitButtonText}>{isSubmitting ? 'Creating account…' : 'Create account'}</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>
        Already have an account? <Link href="/(auth)/sign-in">Sign in</Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  fieldError: {
    color: '#B42318',
    fontSize: 14,
    marginTop: 6,
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
  },
  form: {
    gap: 10,
    marginTop: 32,
  },
  input: {
    borderColor: '#98A2B3',
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: '#B42318',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#208AEF',
    borderRadius: 10,
    marginTop: 14,
    paddingVertical: 14,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  submitError: {
    color: '#B42318',
    marginTop: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#475467',
    fontSize: 16,
    marginTop: 8,
  },
  successMessage: {
    color: '#067647',
    marginTop: 6,
    textAlign: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
  },
});
