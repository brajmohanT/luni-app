import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { Button, SettingsRow, TextField } from '@/design-system/components';
import { type Theme, useTheme } from '@/design-system/theme';
import { useDeleteMyAccount } from '@/features/profile/hooks';
import { ConfirmationDialog } from '@/features/settings/confirmation-dialog';
import { SettingsSaveController } from '@/features/settings/save-controller';
import { SettingsScreen } from '@/features/settings/settings-screen';
import { isApiClientError } from '@/lib/api/errors';
import { withRequestTimeout } from '@/lib/api/with-request-timeout';
import type { AccountDeletionAccepted, Profile } from '@/lib/api/types';
import { clearAccountChatState } from '@/lib/database/chat-persistence';
import { useAuth } from '@/providers/auth-provider';

type Phase = 'review' | 'confirm' | 'reauthenticate' | 'accepted';
type Failure = { message: string; requestId: string | null } | null;

function deletionFailure(error: unknown): Failure {
  const requestId = isApiClientError(error) ? error.requestId : null;
  if (isApiClientError(error)) {
    if (error.code === 'EMAIL_NOT_CONFIRMED') {
      return { message: 'Confirm your email before deleting your account.', requestId };
    }
    if (['MISSING_SESSION', 'MISSING_ACCESS_TOKEN', 'INVALID_ACCESS_TOKEN'].includes(error.code)) {
      return { message: 'Your session expired. Sign in again before deleting your account.', requestId };
    }
  }
  return {
    message: 'We couldn’t request account deletion. Check your connection and try again.',
    requestId,
  };
}

function formatRequestedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function DeleteAccountScreen({ profile, onBack }: { profile: Profile; onBack(): void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const db = useSQLiteContext();
  const deletion = useDeleteMyAccount();
  const { session, signInWithPassword, signOut } = useAuth();
  const [phase, setPhase] = useState<Phase>('review');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);
  const [accepted, setAccepted] = useState<AccountDeletionAccepted | null>(null);
  const [controller] = useState(() => new SettingsSaveController());
  const userId = session?.user.id;

  useEffect(() => () => controller.cancel(), [controller]);

  const back = useCallback(() => {
    if (!controller.isBusy() && phase !== 'accepted') onBack();
  }, [controller, onBack, phase]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => subscription.remove();
  }, [back]));

  const finishAcceptedDeletion = async () => {
    if (!userId) return;
    setBusy(true);
    setFailure(null);
    try {
      await controller.run(
        async () => {
          await clearAccountChatState(db, userId);
          await withRequestTimeout(() => signOut());
        },
        () => { setBusy(false); },
        () => {
          setBusy(false);
          setFailure({
            message: 'Your deletion request was accepted, but Luni couldn’t finish signing out. Try again.',
            requestId: null,
          });
        },
      );
    } catch {
      // Keep the accepted state available for another local cleanup and sign-out attempt.
    }
  };

  const requestDeletion = async (reauthenticate: boolean) => {
    if (!userId || !session?.user.email) return;
    if (reauthenticate && !password) {
      setFailure({ message: 'Enter your password to continue.', requestId: null });
      return;
    }

    setBusy(true);
    setFailure(null);
    let receipt: AccountDeletionAccepted | null = null;
    let stage: 'reauthenticate' | 'delete' | 'finish' = reauthenticate ? 'reauthenticate' : 'delete';
    try {
      await controller.run(
        async () => {
          if (reauthenticate) {
            await withRequestTimeout(() => signInWithPassword({ email: session.user.email!, password }));
            setPassword('');
            stage = 'delete';
          }
          receipt = await deletion.mutateAsync();
          stage = 'finish';
          await clearAccountChatState(db, userId);
          await withRequestTimeout(() => signOut());
        },
        () => { setBusy(false); },
        error => {
          setBusy(false);
          if (receipt) {
            setAccepted(receipt);
            setPhase('accepted');
            setFailure({
              message: 'Your deletion request was accepted, but Luni couldn’t finish signing out. Try again.',
              requestId: null,
            });
            return;
          }
          if (stage === 'reauthenticate') {
            setFailure({ message: 'We couldn’t sign you in. Check your password and connection, then try again.', requestId: null });
            return;
          }
          if (isApiClientError(error) && error.code === 'RECENT_AUTHENTICATION_REQUIRED') {
            setPhase('reauthenticate');
            setFailure(null);
            return;
          }
          setFailure(deletionFailure(error));
          setPhase(reauthenticate ? 'reauthenticate' : 'confirm');
        },
      );
    } catch {
      // The active phase displays the controlled recovery action.
    }
  };

  return (
    <SettingsScreen
      backDisabled={busy || phase === 'accepted'}
      backLabel="Back to account"
      onBack={back}
      subtitle="Permanently remove your Luni account and its data."
      title="Delete account">
      {phase === 'review' && (
        <View style={styles.content}>
          <SettingsRow kind="info" label="Account" value={profile.email} />
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>This cannot be undone</Text>
            <Text style={styles.copy}>
              Deleting your account permanently removes your Luni account and the data associated with it.
            </Text>
          </View>
          <Button variant="destructive" onPress={() => {
            setFailure(null);
            setPhase('confirm');
          }}>Delete account</Button>
        </View>
      )}

      {phase === 'reauthenticate' && (
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Sign in again</Text>
            <Text style={styles.copy}>
              Enter your password to confirm this sensitive action for {profile.email}.
            </Text>
          </View>
          <TextField
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect={false}
            disabled={busy}
            label="Password"
            onChangeText={value => {
              setPassword(value);
              setFailure(null);
            }}
            onSubmitEditing={() => { void requestDeletion(true); }}
            returnKeyType="go"
            secureTextEntry
            textContentType="password"
            value={password}
          />
          {failure && <FailureMessage failure={failure} />}
          <Button
            disabled={!password}
            loading={busy}
            loadingLabel="Deleting account…"
            onPress={() => { void requestDeletion(true); }}
            variant="destructive">
            Delete account
          </Button>
          <Button disabled={busy} onPress={back} variant="outlined">Keep account</Button>
        </View>
      )}

      {phase === 'accepted' && accepted && (
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Deletion requested</Text>
            <Text style={styles.copy}>
              Luni accepted your request on {formatRequestedAt(accepted.requestedAt)}. Finish signing out on this device.
            </Text>
          </View>
          {failure && <FailureMessage failure={failure} />}
          <Button loading={busy} loadingLabel="Signing out…" onPress={() => { void finishAcceptedDeletion(); }}>
            Finish signing out
          </Button>
        </View>
      )}

      <ConfirmationDialog
        cancelLabel="Keep account"
        confirmLabel="Delete account"
        confirmVariant="destructive"
        description="Your Luni account and the data associated with it will be permanently removed."
        errorMessage={phase === 'confirm' ? failure?.message : null}
        errorRequestId={phase === 'confirm' ? failure?.requestId : null}
        loading={busy}
        loadingLabel="Deleting account…"
        onCancel={() => {
          if (busy) return;
          setFailure(null);
          setPhase('review');
        }}
        onConfirm={() => { void requestDeletion(false); }}
        title="Permanently delete account?"
        visible={phase === 'confirm'}
      />
    </SettingsScreen>
  );
}

function FailureMessage({ failure }: { failure: Exclude<Failure, null> }) {
  const { theme } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: theme.spacing.xs }}>
      <Text accessibilityRole="alert" style={{ ...theme.typography.secondary, color: theme.colors.danger }}>
        {failure.message}
      </Text>
      {failure.requestId && (
        <Text selectable style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
          Request ID: {failure.requestId}
        </Text>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { gap: theme.spacing.xl },
  copy: { ...theme.typography.body, color: theme.colors.textMuted },
  heading: { gap: theme.spacing.sm },
  sectionTitle: { ...theme.typography.dialogTitle, color: theme.colors.text },
  warning: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.danger,
    borderRadius: theme.radii.input,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  warningTitle: { ...theme.typography.heading, color: theme.colors.danger },
});
