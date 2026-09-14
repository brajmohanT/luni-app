import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Luni</Text>
      <Text style={styles.subtitle}>Your AI companion.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  title: {
    color: '#171717',
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: '#525252',
    fontSize: 16,
    marginTop: 8,
  },
});
