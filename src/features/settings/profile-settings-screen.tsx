import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { Button, SettingsRow, TextField } from '@/design-system/components';
import { type Theme, useTheme } from '@/design-system/theme';
import { useUpdateMyProfile } from '@/features/profile/hooks';
import { SettingsSaveController } from '@/features/settings/save-controller';
import { SettingsScreen } from '@/features/settings/settings-screen';
import { isApiClientError } from '@/lib/api/errors';
import type { Profile } from '@/lib/api/types';
import { preferredNameSchema, type PreferredNameFormValues } from '@/lib/validation/profile';

function saveErrorMessage(error: unknown) {
  if (isApiClientError(error) && error.code === 'VALIDATION_ERROR') {
    return 'Check your name and try again.';
  }
  if (isApiClientError(error) && ['MISSING_SESSION', 'MISSING_ACCESS_TOKEN', 'INVALID_ACCESS_TOKEN'].includes(error.code)) {
    return 'Your session needs refreshing. Sign in again before saving your name.';
  }
  if (isApiClientError(error) && error.code === 'EMAIL_NOT_CONFIRMED') {
    return 'Confirm your email before saving your name.';
  }
  return 'We couldn’t save your name. Check your connection and try again.';
}

export function ProfileSettingsScreen({ profile, onClose }: { profile: Profile; onClose(): void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const updateProfile = useUpdateMyProfile();
  const [saveController] = useState(() => new SettingsSaveController());
  const {
    control,
    clearErrors,
    formState: { errors, isDirty },
    handleSubmit,
    reset,
  } = useForm<PreferredNameFormValues>({
    defaultValues: { preferredName: profile.preferredName ?? '' },
    resolver: zodResolver(preferredNameSchema),
  });

  useEffect(() => () => saveController.cancel(), [saveController]);

  useEffect(() => {
    if (!isDirty) reset({ preferredName: profile.preferredName ?? '' });
  }, [isDirty, profile.preferredName, reset]);

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

  const saveValidName = useCallback(async ({ preferredName }: PreferredNameFormValues) => {
    if (preferredName === profile.preferredName) {
      onClose();
      return;
    }
    try {
      await saveController.run(
        () => updateProfile.mutateAsync({ preferredName }),
        onClose,
      );
    } catch {
      // Mutation state keeps the error visible and preserves the edited value.
    }
  }, [onClose, profile.preferredName, saveController, updateProfile]);
  const save = handleSubmit(saveValidName);

  return (
    <SettingsScreen
      backDisabled={updateProfile.isPending}
      backLabel="Back to settings"
      onBack={close}
      subtitle="Choose the name or nickname Luni uses for you."
      title="Your profile">
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
              onSubmitEditing={save}
              placeholder="Your name"
              returnKeyType="done"
              textContentType="nickname"
              value={value}
            />
          )}
        />
        <SettingsRow kind="info" label="Email" value={profile.email} />

        {updateProfile.isError && (
          <View accessibilityLiveRegion="polite" style={styles.errorBlock}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {saveErrorMessage(updateProfile.error)}
            </Text>
            {isApiClientError(updateProfile.error) && updateProfile.error.requestId && (
              <Text selectable style={styles.requestId}>Request ID: {updateProfile.error.requestId}</Text>
            )}
          </View>
        )}

        <Button
          disabled={!isDirty}
          loading={updateProfile.isPending}
          loadingLabel="Saving…"
          onPress={save}>
          {updateProfile.isError ? 'Try again' : 'Save name'}
        </Button>
      </View>
    </SettingsScreen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  form: { gap: theme.spacing.xl },
  errorBlock: { gap: theme.spacing.xs },
  errorText: { ...theme.typography.secondary, color: theme.colors.danger },
  requestId: { ...theme.typography.caption, color: theme.colors.textMuted },
});
