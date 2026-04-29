import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { rateRide, subscribeLatestRide, type RideDoc } from '@/services/ride-firestore';
import { resetTrip } from '@/services/trip';

// Driver take ratio mirrors kyra-driver/services/demo-state.ts
// (Kyra keeps under 25%, the rest goes home with the driver).
const DRIVER_TAKE_RATIO = 0.75;

export default function RateScreen() {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [ride, setRide] = useState<RideDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => subscribeLatestRide(setRide), []);

  const finish = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (ride && rating > 0) {
        await rateRide(ride.id, rating, note.trim() || null);
      }
    } catch {
      /* don't block the celebration on a network glitch */
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  const skip = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (ride) {
        await rateRide(ride.id, 0, null);
      }
    } finally {
      resetTrip();
      router.replace('/(tabs)');
    }
  };

  const dismiss = () => {
    resetTrip();
    router.replace('/(tabs)');
  };

  const fare = ride?.fareInr ?? 0;
  const driverShare = Math.round(fare * DRIVER_TAKE_RATIO);
  const driverName = ride?.driver?.name ?? 'Your driver';
  const driverFirst = driverName.split(' ')[0];
  const vehicle = ride?.driver?.vehicle?.split('·')[1]?.trim() ?? 'Auto';

  if (submitted) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(300)} style={styles.celebrationIcon}>
            <MaterialIcons name="favorite" size={44} color={Brand.burgundyDark} />
          </Animated.View>
          <Animated.View entering={FadeInUp.duration(320).delay(80)}>
            <ThemedText type="title" style={styles.title}>
              Thank you
            </ThemedText>
          </Animated.View>
          <Animated.View entering={FadeIn.duration(360).delay(180)} style={styles.impactCard}>
            <ThemedText style={styles.impactLabel}>Where your ₹{fare} went</ThemedText>
            <View style={styles.impactRow}>
              <ThemedText style={styles.impactRowKey}>{driverFirst} took home</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.impactRowValueGold}>
                ₹{driverShare}
              </ThemedText>
            </View>
            <View style={styles.impactRow}>
              <ThemedText style={styles.impactRowKey}>Kyra platform fee</ThemedText>
              <ThemedText style={styles.impactRowValue}>₹{fare - driverShare}</ThemedText>
            </View>
            <View style={styles.impactDivider} />
            <ThemedText style={styles.impactBlurb}>
              Kyra never keeps more than 25%. Industry average is 30–40%.{'\n'}
              That's an extra ₹{Math.max(0, Math.round(fare * 0.075))} in {driverFirst}'s pocket on this ride alone.
            </ThemedText>
          </Animated.View>
          <Animated.View entering={FadeIn.duration(280).delay(260)} style={styles.doneWrap}>
            <BrandButton title="Done" onPress={dismiss} />
          </Animated.View>
        </View>
      </ThemedView>
    );
  }

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
  celebrationIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { textAlign: 'center' },
  subtitle: { color: Brand.beigeMuted, marginBottom: 16 },
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
  skip: { color: Brand.beigeMuted, marginTop: 12 },

  // Celebration view
  impactCard: {
    width: '100%',
    maxWidth: 360,
    padding: 16,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.gold,
    gap: 8,
    marginTop: 8,
  },
  impactLabel: {
    color: Brand.beigeMuted,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  impactRowKey: { color: Brand.beige, fontSize: 14 },
  impactRowValue: { color: Brand.beige, fontSize: 14 },
  impactRowValueGold: { color: Brand.gold, fontSize: 18 },
  impactDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Brand.border,
    marginVertical: 4,
  },
  impactBlurb: {
    color: Brand.beigeMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  doneWrap: { width: '100%', maxWidth: 360, marginTop: 8 },
});
