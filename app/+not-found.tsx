/**
 * Catches any unmatched route and silently navigates away instead of
 * showing the default expo-router "Unmatched Route" / sitemap error page.
 */

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function NotFoundScreen() {
  useEffect(() => {
    // Go back if possible; otherwise fall back to tabs home.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, []);

  return <ThemedView style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
});
