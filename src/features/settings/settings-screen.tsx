import type { PropsWithChildren } from 'react';
import { useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { IconButton } from '@/design-system/components';
import { type Theme, useTheme } from '@/design-system/theme';
import { useScreenReaderFocus } from '@/features/auth/use-screen-reader-focus';

type SettingsScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  backLabel: string;
  backDisabled?: boolean;
  onBack(): void;
}>;

function BackIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg accessible={false} height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M19 12H5m6-6-6 6 6 6" fill="none" stroke={color}
        strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
    </Svg>
  );
}

export function SettingsScreen({
  title,
  subtitle,
  backLabel,
  backDisabled = false,
  onBack,
  children,
}: SettingsScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const titleRef = useScreenReaderFocus(title);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!backDisabled) onBack();
      return true;
    });
    return () => subscription.remove();
  }, [backDisabled, onBack]));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton accessibilityLabel={backLabel} disabled={backDisabled} icon={BackIcon} onPress={onBack} />
          <Text ref={titleRef} accessibilityRole="header" style={styles.title}>{title}</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.canvas,
    flex: 1,
  },
  header: {
    borderBottomColor: theme.colors.settingsBorder,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    maxWidth: 720,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    width: '100%',
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    width: '100%',
  },
  subtitle: {
    ...theme.typography.secondary,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xl,
    maxWidth: 520,
  },
});
