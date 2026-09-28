import { Link, Stack, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/design-system/tokens';
import { SessionLoadingScreen } from '@/features/auth/session-loading-screen';
import { AppProviders } from '@/providers/app-providers';
import { useAuth } from '@/providers/auth-provider';

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const pathname = usePathname();
  const { isLoading } = useAuth();

  if (isLoading) {
    return <SessionLoadingScreen />;
  }

  return (
    <>
      {__DEV__ && pathname !== '/design-system' && (
        <SafeAreaView edges={['top']} style={styles.developmentBar}>
          <Link href="/design-system" style={styles.developmentLink}>
            <Text>Open Design System · Dev</Text>
          </Link>
        </SafeAreaView>
      )}
      <View style={styles.navigator}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={__DEV__}>
            <Stack.Screen name="design-system" />
          </Stack.Protected>
        </Stack>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  navigator: { flex: 1 },
  developmentBar: { backgroundColor: palette.chatBlue },
  developmentLink: { color: palette.white, fontSize: 14, fontWeight: '600', padding: 14, minHeight: 44, textAlign: 'center' },
});
