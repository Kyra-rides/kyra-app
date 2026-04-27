import { Button, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Kyra
      </ThemedText>
      <ThemedText style={styles.tagline}>
        Every rider and driver, a verified woman.
      </ThemedText>
      <Button title="Start" onPress={() => router.push('/sign-up')} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    marginBottom: 8,
  },
});
