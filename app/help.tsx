import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

type Topic = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

const topics: Topic[] = [
  { id: 'fare', label: 'Ride fare', icon: 'attach-money' },
  { id: 'driver', label: 'Driver & vehicle', icon: 'directions-car' },
  { id: 'payment', label: 'Payment', icon: 'payments' },
  { id: 'safety', label: 'Safety', icon: 'security' },
  { id: 'verification', label: 'Verification', icon: 'verified-user' },
  { id: 'other', label: 'Other', icon: 'more-horiz' },
];

export default function HelpScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Help" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.search}>
          <MaterialIcons name="search" size={20} color={Brand.beigeMuted} />
          <TextInput
            placeholder="Search issues"
            placeholderTextColor={Brand.beigeMuted}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.lastRideCard}>
          <View style={styles.lastRideTop}>
            <ThemedText type="defaultSemiBold">Your last ride</ThemedText>
            <Pressable onPress={() => router.push('/rides')}>
              <ThemedText style={styles.link}>View all rides</ThemedText>
            </Pressable>
          </View>
          <ThemedText style={styles.lastRideMeta}>
            Auto · 26 Apr 2026 · ₹142
          </ThemedText>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: Brand.gold }]} />
            <ThemedText style={styles.routeText}>Indiranagar Metro</ThemedText>
          </View>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: Brand.beige }]} />
            <ThemedText style={styles.routeText}>Cubbon Park</ThemedText>
          </View>
        </View>

        <View style={styles.issueCard}>
          <ThemedText style={styles.issueText}>Having an issue?</ThemedText>
          <Pressable style={styles.helpBtn}>
            <ThemedText style={styles.helpBtnText}>Get help</ThemedText>
          </Pressable>
        </View>

        <ThemedText type="defaultSemiBold" style={styles.section}>
          FAQs
        </ThemedText>
        <View style={styles.grid}>
          {topics.map((t) => (
            <Pressable key={t.id} style={styles.tile}>
              <MaterialIcons name={t.icon} size={28} color={Brand.gold} />
              <ThemedText style={styles.tileLabel}>{t.label}</ThemedText>
            </Pressable>
          ))}
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.burgundyLight,
  },
  searchInput: {
    flex: 1,
    color: Brand.beige,
    fontSize: 14,
    paddingVertical: 0,
  },
  lastRideCard: {
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    gap: 4,
  },
  lastRideTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: {
    color: Brand.gold,
    fontSize: 13,
  },
  lastRideMeta: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginBottom: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    color: Brand.beigeMuted,
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  issueText: {
    fontSize: 14,
  },
  helpBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Brand.radius,
    backgroundColor: Brand.beige,
  },
  helpBtnText: {
    color: Brand.burgundyDark,
    fontWeight: '600',
    fontSize: 13,
  },
  section: {
    marginTop: 8,
    color: Brand.beigeMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  tileLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});
