import { useEffect, useState } from 'react';

import { SettingsRow } from '@/design-system/components';
import { ConfirmationDialog } from '@/features/settings/confirmation-dialog';
import { SettingsSaveController } from '@/features/settings/save-controller';
import { SettingsScreen } from '@/features/settings/settings-screen';
import type { Profile } from '@/lib/api/types';
import { withRequestTimeout } from '@/lib/api/with-request-timeout';
import { useAuth } from '@/providers/auth-provider';

export function AccountSettingsScreen({
  profile,
  onBack,
  onDeleteAccount,
}: {
  profile: Profile;
  onBack(): void;
  onDeleteAccount(): void;
}) {
  const { signOut } = useAuth();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signOutController] = useState(() => new SettingsSaveController());

  useEffect(() => () => signOutController.cancel(), [signOutController]);

  const openConfirmation = () => {
    setSignOutError(null);
    setConfirmingSignOut(true);
  };
  const closeConfirmation = () => {
    if (signOutController.isBusy()) return;
    setSignOutError(null);
    setConfirmingSignOut(false);
  };
  const confirmSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOutController.run(
        () => withRequestTimeout(() => signOut()),
        () => { setSigningOut(false); },
        () => {
          setSigningOut(false);
          setSignOutError('We couldn’t sign you out. Check your connection and try again.');
        },
      );
    } catch {
      // The confirmation remains open so the same action can be retried.
    }
  };

  return (
    <SettingsScreen
      backDisabled={signingOut}
      backLabel="Back to settings"
      onBack={onBack}
      subtitle="Manage your signed-in Luni account."
      title="Account">
      <SettingsRow kind="info" label="Email" value={profile.email} />

      <SettingsRow
        description="Keep your account and saved data"
        kind="navigation"
        label="Sign out"
        onPress={openConfirmation}
      />
      <SettingsRow
        description="Permanently remove your account and data"
        kind="navigation"
        label="Delete account"
        onPress={onDeleteAccount}
      />

      <ConfirmationDialog
        cancelLabel="Stay signed in"
        confirmLabel="Sign out"
        description="You’ll need to sign in again to return to your conversation."
        errorMessage={signOutError}
        loading={signingOut}
        loadingLabel="Signing out…"
        onCancel={closeConfirmation}
        onConfirm={() => { void confirmSignOut(); }}
        title="Sign out?"
        visible={confirmingSignOut}
      />
    </SettingsScreen>
  );
}
