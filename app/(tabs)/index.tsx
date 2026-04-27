import { Button, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Sample data — a preview of real verified women drivers on Kyra.
// Will be replaced with live driver data once the backend is in place.
const sampleDrivers = [
  { id: '1', name: 'Priya',   initial: 'P', rating: 4.9, vehicle: 'Auto', eta: '3 min', color: '#fde68a' },
  { id: '2', name: 'Lakshmi', initial: 'L', rating: 4.8, vehicle: 'Bike', eta: '5 min', color: '#bfdbfe' },
  { id: '3', name: 'Anjali',  initial: 'A', rating: 5.0, vehicle: 'Auto', eta: '6 min', color: '#fecaca' },
  { id: '4', name: 'Sneha',   initial: 'S', rating: 4.9, vehicle: 'Auto', eta: '8 min', color: '#bbf7d0' },
];

// One driver card — shown 4 times in the horizontal scroll below.
function DriverCard({ driver }: { driver: typeof sampleDrivers[number] }) {
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: driver.color }]}>
        <ThemedText type="defaultSemiBold" style={styles.avatarText}>
          {driver.initial}
        </ThemedText>
      </View>
      <ThemedText type="defaultSemiBold">{driver.name}</ThemedText>
      <ThemedText style={styles.cardSub}>
        ★ {driver.rating} · {driver.vehicle}
      </ThemedText>
      <ThemedText style={styles.cardEta}>{driver.eta} away</ThemedText>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Kyra
      </ThemedText>
      <ThemedText style={styles.tagline}>
        Every rider and driver, a verified woman.
      </ThemedText>

      <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
        Our drivers
      </ThemedText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.cardsScroll}
        contentContainerStyle={styles.cardsRow}
      >
        {sampleDrivers.map((driver) => (
          <DriverCard key={driver.id} driver={driver} />
        ))}
      </ScrollView>

      <View style={styles.startButton}>
        <Button title="Start" onPress={() => router.push('/sign-up')} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  title: {
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    textAlign: 'center',
    marginTop: 8,
  },
  cardsScroll: {
    flexGrow: 0, // don't stretch vertically — let cards drive height
  },
  cardsRow: {
    paddingHorizontal: 4,
    gap: 12,
  },
  card: {
    width: 130,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 22,
    color: '#000',
  },
  cardSub: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardEta: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  startButton: {
    marginTop: 12,
    minWidth: 200,
  },
});
