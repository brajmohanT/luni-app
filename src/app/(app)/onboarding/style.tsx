import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/design-system/theme';
import { ProfileScreen } from '@/features/profile/profile-screen';

// The next onboarding milestone replaces this handoff with the style selector.
export default function ConversationStyleHandoffScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ProfileScreen
      subtitle="Pick a starting style. You can change this later."
      title="How would you like to talk?">
      <View style={styles.notice}>
        <Text style={styles.text}>Your name is saved.</Text>
      </View>
    </ProfileScreen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  notice: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.input, padding: theme.spacing.lg },
  text: { ...theme.typography.secondary, color: theme.colors.textMuted },
});
