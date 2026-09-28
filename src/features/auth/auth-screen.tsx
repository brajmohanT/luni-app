import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { IconButton } from '@/design-system/components';
import { useTheme, type Theme } from '@/design-system/theme';
import { useScreenReaderFocus } from '@/features/auth/use-screen-reader-focus';

type AuthScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  onBack(): void;
}>;

function BackIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M19 12H5m6-6-6 6 6 6"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AuthScreen({ title, subtitle, onBack, children }: AuthScreenProps) {
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
            <View style={styles.header}>
              <IconButton
                accessibilityLabel="Back to welcome"
                icon={BackIcon}
                onPress={onBack}
                variant="outlined"
              />
            </View>
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
    maxWidth: 480,
    paddingBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xl,
    width: '100%',
  },
  header: { alignItems: 'flex-start', minHeight: 72, paddingTop: theme.spacing.md },
  intro: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxxl,
    marginTop: theme.spacing.xxl,
  },
  title: { ...theme.typography.title, color: theme.colors.text },
  subtitle: { ...theme.typography.body, color: theme.colors.textMuted, maxWidth: 360 },
});
