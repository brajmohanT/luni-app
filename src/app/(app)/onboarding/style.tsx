import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design-system/components';
import { useTheme, type Theme } from '@/design-system/theme';
import { authRoutes } from '@/features/auth/routes';
import { useCompleteMyOnboarding, useMyProfile, useUpdateMyProfile } from '@/features/profile/hooks';
import { OnboardingCompletionController } from '@/features/profile/onboarding-completion-controller';
import { ProfileScreen } from '@/features/profile/profile-screen';
import { isApiClientError } from '@/lib/api/errors';
import type { ConversationStyle } from '@/lib/api/types';

const styleOptions = [
  { value: 'warm_balanced', label: 'Warm and balanced', sample: 'Hey, how has your day been?' },
  { value: 'gentle_reassuring', label: 'Gentle and reassuring', sample: 'Hey. Take your time. How are you feeling?' },
  { value: 'playful_casual', label: 'Playful and casual', sample: 'Hey! What kind of day are we having?' },
  { value: 'direct_thoughtful', label: 'Direct and thoughtful', sample: 'Hey. What’s on your mind?' },
] as const satisfies readonly { value: ConversationStyle; label: string; sample: string }[];

export default function ConversationStyleScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const profile = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const completeOnboarding = useCompleteMyOnboarding();
  const [completion] = useState(() => new OnboardingCompletionController());
  const submission = useSyncExternalStore(completion.subscribe, completion.getSnapshot, completion.getSnapshot);
  const isSubmitting = completion.isBusy();
  useEffect(() => () => completion.cancel(), [completion]);
  // A background profile refresh must not overwrite the user's current choice.
  const selectedStyle = submission.style ?? profile.data?.conversationStyle;
  const [focusedStyle, setFocusedStyle] = useState<ConversationStyle | null>(null);
  const selectedOption = styleOptions.find(option => option.value === selectedStyle);
  const editName = useCallback(() => {
    if (!completion.isBusy()) router.replace(authRoutes.preferredName);
  }, [completion, router]);
  const submit = (style: ConversationStyle) => {
    void completion.submit(style, updateProfile.mutateAsync, () => completeOnboarding.mutateAsync());
  };

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      editName();
      return true;
    });
    return () => subscription.remove();
  }, [editName]));

  if (submission.phase === 'complete') {
    return <Redirect href={authRoutes.authenticated} />;
  }

  if (profile.data && !profile.data.preferredName) {
    return <Redirect href={authRoutes.preferredName} />;
  }

  const requestId = isApiClientError(profile.error) ? profile.error.requestId : null;

  return (
    <ProfileScreen
      onBack={editName}
      backDisabled={isSubmitting}
      backLabel="Back to preferred name"
      subtitle="Pick a starting style. You can change this later."
      title="How would you like to talk?">
      {!profile.data ? (
        profile.isError ? (
          <View style={styles.status}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              We couldn’t load your conversation style. Check your connection and try again.
            </Text>
            {requestId && <Text selectable style={styles.sampleLabel}>Request ID: {requestId}</Text>}
            <Button loading={profile.isFetching} loadingLabel="Loading…" onPress={() => void profile.refetch()}>
              Try again
            </Button>
          </View>
        ) : (
          <View accessibilityLiveRegion="polite" style={styles.status}>
            <ActivityIndicator color={theme.colors.primary} accessibilityLabel="Loading your conversation style" />
            <Text style={styles.sampleLabel}>Loading your conversation style…</Text>
          </View>
        )
      ) : (
        <>
          <View accessibilityRole="radiogroup" accessibilityLabel="Conversation style">
            {styleOptions.map(option => {
              const selected = selectedStyle === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityHint={option.sample}
                  accessibilityState={{ checked: selected, disabled: isSubmitting }}
                  disabled={isSubmitting}
                  onPress={() => completion.select(option.value)}
                  onFocus={() => setFocusedStyle(option.value)}
                  onBlur={() => setFocusedStyle(null)}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && !isSubmitting && styles.pressed,
                    isSubmitting && styles.disabledOption,
                    focusedStyle === option.value && styles.focused,
                  ]}>
                  <View
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sample}>
            <Text style={styles.sampleLabel}>A greeting from Luni</Text>
            <Text accessibilityLiveRegion="polite" style={styles.sampleText}>
              {selectedOption?.sample}
            </Text>
          </View>
          <View style={styles.actions}>
            {submission.phase === 'failed' && (
              <View accessibilityLiveRegion="polite" style={styles.status}>
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {completionErrorMessage(submission.error, submission.savedStyle === selectedStyle)}
                </Text>
                {isApiClientError(submission.error) && submission.error.requestId && (
                  <Text selectable style={styles.sampleLabel}>Request ID: {submission.error.requestId}</Text>
                )}
              </View>
            )}
            <Button
              disabled={!selectedStyle}
              loading={isSubmitting}
              loadingLabel={submission.phase === 'saving' ? 'Saving…' : 'Finishing setup…'}
              onPress={() => { if (selectedStyle) submit(selectedStyle); }}>
              {submission.phase === 'failed' ? 'Try again' : 'Start talking'}
            </Button>
            <Button variant="outlined" disabled={isSubmitting} onPress={() => submit('warm_balanced')}>
              Skip for now
            </Button>
          </View>
        </>
      )}
    </ProfileScreen>
  );
}

function completionErrorMessage(error: unknown, styleSaved: boolean) {
  if (isApiClientError(error)) {
    if (error.code === 'ONBOARDING_PROFILE_INCOMPLETE') return 'Go back and save your name before finishing setup.';
    if (error.code === 'EMAIL_NOT_CONFIRMED') return 'Confirm your email, then try again.';
    if (['MISSING_SESSION', 'MISSING_ACCESS_TOKEN', 'INVALID_ACCESS_TOKEN'].includes(error.code)) {
      return 'Your session needs refreshing. Sign in again to finish setup.';
    }
  }
  return styleSaved
    ? 'Your style is saved. We couldn’t confirm setup is complete. Try again.'
    : 'We couldn’t confirm your style was saved. Check your connection and try again.';
}

const createStyles = (theme: Theme) => StyleSheet.create({
  actions: { gap: theme.spacing.md, marginTop: theme.spacing.xxl },
  disabledOption: { opacity: 0.5 },
  status: { gap: theme.spacing.lg },
  errorText: { ...theme.typography.secondary, color: theme.colors.danger },
  option: {
    alignItems: 'center',
    borderBottomColor: theme.colors.settingsBorder,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: theme.sizing.settingsRowMinHeight,
    paddingVertical: theme.spacing.lg,
  },
  optionLabel: { ...theme.typography.body, color: theme.colors.text, flex: 1 },
  pressed: { backgroundColor: theme.colors.composer },
  focused: { outlineColor: theme.colors.focus, outlineWidth: 2, outlineOffset: 2, outlineStyle: 'solid' },
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
  radioSelected: { borderColor: theme.colors.focus },
  radioDot: { backgroundColor: theme.colors.focus, borderRadius: theme.radii.pill, height: 10, width: 10 },
  sample: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.message,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xxl,
    padding: theme.spacing.lg,
  },
  sampleLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
  sampleText: { ...theme.typography.message, color: theme.colors.text },
});
