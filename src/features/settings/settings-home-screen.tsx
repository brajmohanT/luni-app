import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LuniLogo, SettingsRow } from '@/design-system/components';
import { type Theme, useTheme } from '@/design-system/theme';
import { SettingsScreen } from '@/features/settings/settings-screen';
import { styleLabels } from '@/features/settings/values';
import type { Profile } from '@/lib/api/types';

type SettingsHomeScreenProps = {
  profile: Profile;
  appearance: string;
  onBack(): void;
  onOpenAccount(): void;
  onOpenAppearance(): void;
  onOpenProfile(): void;
  onOpenStyle(): void;
};

export function SettingsHomeScreen({
  profile,
  appearance,
  onBack,
  onOpenAccount,
  onOpenAppearance,
  onOpenProfile,
  onOpenStyle,
}: SettingsHomeScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const preferredName = profile.preferredName ?? 'Not set';

  return (
    <SettingsScreen backLabel="Back to chat" onBack={onBack} title="Settings">
      <View style={styles.identity}>
        <View style={styles.logo}>
          <LuniLogo decorative size={28} />
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>{preferredName}</Text>
          <Text style={styles.identityCaption}>You and Luni</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>You and Luni</Text>
      <SettingsRow kind="navigation" label="Profile" value={preferredName} onPress={onOpenProfile} />
      <SettingsRow kind="navigation" label="Conversation style"
        value={styleLabels[profile.conversationStyle]} onPress={onOpenStyle} />

      <Text style={styles.sectionTitle}>Preferences</Text>
      <SettingsRow kind="navigation" label="Appearance" value={appearance} onPress={onOpenAppearance} />

      <Text style={styles.sectionTitle}>Account</Text>
      <SettingsRow kind="navigation" label="Account" description="View your signed-in account"
        onPress={onOpenAccount} />
    </SettingsScreen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  identityCaption: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xxl,
    textTransform: 'uppercase',
  },
});

