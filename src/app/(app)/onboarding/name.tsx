import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { Button, TextField } from '@/design-system/components';
import { useTheme, type Theme } from '@/design-system/theme';
import { authRoutes } from '@/features/auth/routes';
import { useMyProfile, useUpdateMyProfile } from '@/features/profile/hooks';
import { ProfileScreen } from '@/features/profile/profile-screen';
import { isApiClientError } from '@/lib/api/errors';
import {
  preferredNameSchema,
  type PreferredNameFormValues,
} from '@/lib/validation/profile';

function getSaveErrorMessage(error: unknown) {
  if (isApiClientError(error) && error.code === 'VALIDATION_ERROR') {
    return 'Check your name and try again.';
  }

  return 'We couldn’t save your name. Check your connection and try again.';
}

export default function PreferredNameScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const profile = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const {
    control,
    clearErrors,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<PreferredNameFormValues>({
    defaultValues: { preferredName: '' },
    resolver: zodResolver(preferredNameSchema),
  });

  useEffect(() => {
    if (profile.data?.preferredName) {
      reset({ preferredName: profile.data.preferredName });
    }
  }, [profile.data?.preferredName, reset]);

  const onSubmit = handleSubmit(async ({ preferredName }) => {
    try {
      await updateProfile.mutateAsync({ preferredName });
      router.replace(authRoutes.conversationStyle);
    } catch {
      // Mutation state renders the retryable error without clearing the field.
    }
  });

  return (
    <ProfileScreen
      subtitle="A name or nickname is fine. You can change it in settings."
      title="What should I call you?">
      <View style={styles.form}>
        <Controller
          control={control}
          name="preferredName"
          render={({ field: { onBlur, onChange, ref, value } }) => (
            <TextField
              ref={ref}
              autoCapitalize="words"
              autoComplete="name"
              autoCorrect={false}
              disabled={updateProfile.isPending}
              errorText={errors.preferredName?.message}
              label="Preferred name"
              maxLength={40}
              onBlur={onBlur}
              onChangeText={nextValue => {
                clearErrors();
                updateProfile.reset();
                onChange(nextValue);
              }}
              onSubmitEditing={onSubmit}
              placeholder="Your name"
              returnKeyType="done"
              textContentType="nickname"
              value={value}
            />
          )}
        />

        {updateProfile.isError && (
          <View accessibilityLiveRegion="polite" style={styles.errorBlock}>
            <Text style={styles.errorText}>{getSaveErrorMessage(updateProfile.error)}</Text>
            {isApiClientError(updateProfile.error) && updateProfile.error.requestId && (
              <Text selectable style={styles.requestId}>
                Request ID: {updateProfile.error.requestId}
              </Text>
            )}
          </View>
        )}

        <Button
          loading={updateProfile.isPending}
          loadingLabel="Saving…"
          onPress={onSubmit}>
          {updateProfile.isError ? 'Try again' : 'Continue'}
        </Button>
      </View>
    </ProfileScreen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  form: { gap: theme.spacing.xl },
  errorBlock: { gap: theme.spacing.xs },
  errorText: { ...theme.typography.secondary, color: theme.colors.danger },
  requestId: { ...theme.typography.caption, color: theme.colors.textMuted },
});
