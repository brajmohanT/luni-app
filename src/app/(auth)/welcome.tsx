import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandBackground, Button, LuniLogo } from '@/design-system/components';
import { useTheme, type Theme } from '@/design-system/theme';
import { authRoutes } from '@/features/auth/routes';

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.page}>
          <BrandBackground variant="welcome" style={styles.art}>
            <LuniLogo accessibilityLabel="Luni" size={78} />
          </BrandBackground>

          <View style={styles.copy}>
            <Text style={styles.wordmark}>luni</Text>
            <Text accessibilityRole="header" style={styles.title}>
              A little company.{`\n`}Room to be you.
            </Text>
            <Text style={styles.subtitle}>Your AI companion for everyday conversations.</Text>
          </View>

          <View style={styles.actions}>
            <Button onPress={() => router.push(authRoutes.signIn)} style={styles.action}>
              Sign in
            </Button>
            <Button
              onPress={() => router.push(authRoutes.signUp)}
              style={styles.action}
              variant="outlined">
              Create account
            </Button>
          </View>

          <Text style={styles.note}>Continue with email and password.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.canvas },
  scrollContent: { flexGrow: 1 },
  page: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 480,
    paddingBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    width: '100%',
  },
  art: {
    alignItems: 'center',
    borderRadius: theme.radii.dialog,
    height: 196,
    justifyContent: 'center',
  },
  copy: { marginTop: theme.spacing.xxl },
  wordmark: {
    ...theme.typography.heading,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  title: { ...theme.typography.title, color: theme.colors.text },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    maxWidth: 340,
  },
  actions: { gap: theme.spacing.md, marginTop: theme.spacing.xxxl },
  action: { alignSelf: 'stretch' },
  note: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
});
