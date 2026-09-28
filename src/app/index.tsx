import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';

export default function IndexScreen() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={session ? '/(app)' : '/(auth)/welcome'} />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
