import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';

export default function AppHomeScreen() {
  const { session } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Luni</Text>
      <Text style={styles.subtitle}>{session?.user.email}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
  },
});
