import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandBackground, LuniLogo } from '@/design-system/components';
import { useTheme, type Theme } from '@/design-system/theme';
import { useScreenReaderFocus } from '@/features/auth/use-screen-reader-focus';

type ProfileScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

export function ProfileScreen({ title, subtitle, children }: ProfileScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const titleRef = useScreenReaderFocus(title);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.page}>
            <BrandBackground variant="welcome" style={styles.mark}>
              <LuniLogo decorative size={44} />
            </BrandBackground>
            <View style={styles.intro}>
              <Text ref={titleRef} accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.canvas },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 480,
    paddingBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxxl,
    width: '100%',
  },
  mark: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: theme.radii.input,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  intro: { gap: theme.spacing.sm, marginBottom: theme.spacing.xxxl, marginTop: theme.spacing.xxl },
  title: { ...theme.typography.title, color: theme.colors.text },
  subtitle: { ...theme.typography.body, color: theme.colors.textMuted, maxWidth: 360 },
});
