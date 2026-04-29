import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/list-row';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function AboutScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="About" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandCard}>
          <Image
            source={require('@/assets/images/kyra-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText style={styles.tagline}>
            Bengaluru&apos;s women-only mobility platform.
          </ThemedText>
          <ThemedText style={styles.version}>Version 0.1.0 · made in India</ThemedText>
        </View>

        <View style={styles.group}>
          <ListRow icon="description" label="Terms & Conditions" />
          <ListRow icon="lock-outline" label="Privacy Policy" />
          <ListRow icon="gavel" label="Licenses" />
          <ListRow icon="public" label="kyrarides.in" />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.burgundy,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  brandCard: {
    alignItems: 'center',
    gap: 8,
    padding: 20,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  logo: {
    width: 160,
    height: 80,
  },
  tagline: {
    color: Brand.beigeMuted,
    textAlign: 'center',
  },
  version: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 8,
  },
  group: {
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    overflow: 'hidden',
  },
});
