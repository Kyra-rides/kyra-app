import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { rateRide, subscribeLatestRide, type RideDoc } from '@/services/ride-firestore';
import { resetTrip } from '@/services/trip';

export default function RateScreen() {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [ride, setRide] = useState<RideDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => subscribeLatestRide(setRide), []);

  const finish = async () => {
    if (submitting) return;
    setSubmitting(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (ride && rating > 0) {
        await rateRide(ride.id, rating, note.trim() || null);
      }
    } finally {
      resetTrip();
      router.replace('/(tabs)');
    }
  };

  const skip = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (ride) {
        // Skip = rate 0 / no note, but still close the cycle.
        await rateRide(ride.id, 0, null);
      }
    } finally {
      resetTrip();
      router.replace('/(tabs)');
    }
  };

  const fare = ride?.fareInr ?? 0;
  const driverName = ride?.driver?.name ?? 'Your driver';
  const vehicle = ride?.driver?.vehicle?.split('·')[1]?.trim() ?? 'Auto';

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeInUp.duration(280)} style={styles.driverAvatar}>
          <MaterialIcons name="person" size={40} color={Brand.burgundyDark} />
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(280).delay(60)}>
          <ThemedText type="title" style={styles.title}>
            How was your ride?
          </ThemedText>
        </Animated.View>
        <ThemedText style={styles.subtitle}>
          {driverName} · {vehicle} · ₹{fare}
        </ThemedText>

        <Animated.View entering={FadeInUp.duration(300).delay(120)} style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                void Haptics.selectionAsync();
                setRating(n);
              }}
              hitSlop={6}
              style={({ pressed }) => pressed && { transform: [{ scale: 0.9 }] }}
            >
              <MaterialIcons
                name={n <= rating ? 'star' : 'star-border'}
                size={42}
                color={Brand.gold}
              />
            </Pressable>
          ))}
        </Animated.View>

        <TextInput
          style={styles.note}
          placeholder="Add a note (optional)"
          placeholderTextColor={Brand.beigeMuted}
          value={note}
          onChangeText={setNote}
          multiline
        />

        <BrandButton
          title={submitting ? 'Submitting…' : 'Submit'}
          onPress={finish}
          disabled={rating === 0 || submitting}
        />
        <Pressable onPress={skip} disabled={submitting}>
          <ThemedText style={styles.skip}>Skip</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.burgundy,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  driverAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    color: Brand.beigeMuted,
    marginBottom: 16,
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  note: {
    width: '100%',
    minHeight: 80,
    padding: 14,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.burgundyLight,
    color: Brand.beige,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  skip: {
    color: Brand.beigeMuted,
    marginTop: 12,
  },
});
