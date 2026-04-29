import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

type Ride = {
  id: string;
  vehicle: 'Auto' | 'Bike Taxi';
  date: string;
  fare: number;
  status: 'Completed' | 'Cancelled';
  from: string;
  to: string;
};

const past: Ride[] = [
  {
    id: 'r1',
    vehicle: 'Auto',
    date: '26 Apr 2026 · 03:03 PM',
    fare: 142,
    status: 'Completed',
    from: 'Indiranagar Metro, Bengaluru',
    to: 'Cubbon Park, Kasturba Rd',
  },
  {
    id: 'r2',
    vehicle: 'Bike Taxi',
    date: '24 Apr 2026 · 09:12 AM',
    fare: 76,
    status: 'Completed',
    from: 'HSR Layout, 27th Main',
    to: 'Forum Mall, Koramangala',
  },
  {
    id: 'r3',
    vehicle: 'Auto',
    date: '21 Apr 2026 · 06:48 PM',
    fare: 0,
    status: 'Cancelled',
    from: 'Whitefield, Phoenix Marketcity',
    to: 'MG Road Metro',
  },
];

export default function RidesScreen() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('past');

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="My rides" />

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('upcoming')}
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
        >
          <ThemedText style={[styles.tabLabel, tab === 'upcoming' && styles.tabLabelActive]}>
            Upcoming
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setTab('past')}
          style={[styles.tab, tab === 'past' && styles.tabActive]}
        >
          <ThemedText style={[styles.tabLabel, tab === 'past' && styles.tabLabelActive]}>
            Past
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'upcoming' ? (
          <ThemedText style={styles.empty}>No upcoming rides.</ThemedText>
        ) : (
          past.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <ThemedText type="defaultSemiBold">{r.vehicle}</ThemedText>
                <ThemedText style={styles.cardDate}>{r.date}</ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.cardFare}>
                  ₹{r.fare}
                </ThemedText>
              </View>
              <ThemedText
                style={[
                  styles.status,
                  r.status === 'Cancelled' ? styles.statusCancel : styles.statusOk,
                ]}
              >
                {r.status}
              </ThemedText>
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: Brand.gold }]} />
                <ThemedText style={styles.routeText}>{r.from}</ThemedText>
              </View>
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: Brand.beige }]} />
                <ThemedText style={styles.routeText}>{r.to}</ThemedText>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.burgundy,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.burgundyLight,
  },
  tabActive: {
    backgroundColor: Brand.gold,
    borderColor: Brand.gold,
  },
  tabLabel: {
    fontSize: 13,
  },
  tabLabelActive: {
    color: Brand.burgundyDark,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    color: Brand.beigeMuted,
    paddingVertical: 32,
  },
  card: {
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDate: {
    flex: 1,
    fontSize: 12,
    color: Brand.beigeMuted,
  },
  cardFare: {
    fontSize: 15,
  },
  status: {
    fontSize: 12,
  },
  statusOk: {
    color: '#9FD8A6',
  },
  statusCancel: {
    color: '#F4B7B7',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
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
});
