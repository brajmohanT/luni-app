import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandBackground, LuniLogo } from '@/design-system/components';
import { useTheme, type Theme } from '@/design-system/theme';

export function SessionLoadingScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <BrandBackground variant="welcome" style={styles.mark}>
          <LuniLogo decorative size={48} />
        </BrandBackground>
        <View style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title}>Opening Luni</Text>
          <Text style={styles.message}>Checking your saved sign-in…</Text>
        </View>
        <ActivityIndicator
          accessibilityLabel="Opening Luni. Checking your saved sign-in."
          accessibilityRole="progressbar"
          color={theme.colors.primary}
          size="small"
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xxl,
  },
  mark: {
    alignItems: 'center',
    borderRadius: theme.radii.dialog,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  copy: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
    marginTop: theme.spacing.xl,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  message: {
    ...theme.typography.secondary,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
