import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TRAFFIC_COLORS, useDarkMapReady } from '@/constants/map-style';
import { Brand } from '@/constants/theme';
import {
  subscribeLatestRide,
  subscribeRideSecret,
  type RideDoc,
} from '@/services/ride-firestore';
import { useTrip } from '@/services/trip';

export default function RideScreen() {
  const { pickup: tripPickup, drop: tripDrop, route } = useTrip();
  const darkMap = useDarkMapReady();
  const [ride, setRide] = useState<RideDoc | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Subscribe to the latest ride doc — for the prototype the rider has at most one active.
  useEffect(() => {
    const unsub = subscribeLatestRide((r) => {
      setRide(r);
      setHydrated(true);
    });
    return unsub;
  }, []);

  // Subscribe to OTP secret only after status reaches 'accepted'.
  useEffect(() => {
    if (!ride || ride.status === 'requested' || ride.status === 'dispatching') {
      setOtp(null);
      return;
    }
    if (ride.status === 'rated' || ride.status === 'cancelled') {
      setOtp(null);
      return;
    }
    const unsub = subscribeRideSecret(ride.id, setOtp);
    return unsub;
  }, [ride?.id, ride?.status]);

  // Auto-navigate when status terminates.
  useEffect(() => {
    if (!hydrated || !ride) return;
    if (ride.status === 'completed') {
      router.replace('/rate');
    }
    if (ride.status === 'rated' || ride.status === 'cancelled') {
      router.replace('/(tabs)');
    }
  }, [ride?.status, hydrated]);

  // Haptic when driver accepts.
  const lastHapticStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!ride) return;
    if (ride.status !== lastHapticStatus.current) {
      if (ride.status === 'accepted') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (ride.status === 'in_progress') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      lastHapticStatus.current = ride.status;
    }
  }, [ride?.status]);

  // Pickup/drop coords — prefer the ride doc, fallback to in-memory trip store
  // (covers the brief moment between booking and the listener firing).
  const pickupCoord = ride?.pickup.coord ?? tripPickup?.coord ?? null;
  const dropCoord = ride?.drop.coord ?? tripDrop?.coord ?? null;

  const initialRegion = useMemo(() => {
    if (!pickupCoord) return undefined;
    const lats = [pickupCoord.lat, dropCoord?.lat ?? pickupCoord.lat];
    const lngs = [pickupCoord.lng, dropCoord?.lng ?? pickupCoord.lng];
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const dLat = Math.max(0.02, (Math.max(...lats) - Math.min(...lats)) * 1.6);
    const dLng = Math.max(0.02, (Math.max(...lngs) - Math.min(...lngs)) * 1.6);
    return { latitude: midLat, longitude: midLng, latitudeDelta: dLat, longitudeDelta: dLng };
  }, [pickupCoord, dropCoord]);

  // A simulated driver pin — sits 200m offset from pickup while approaching,
  // then interpolates pickup → drop while in_progress for the demo's "live" feel.
  const driverProgress = useSharedValue(0);
  useEffect(() => {
    if (!ride) return;
    if (ride.status === 'accepted') {
      driverProgress.value = 0;
      driverProgress.value = withTiming(0.95, { duration: 30000, easing: Easing.linear });
    } else if (ride.status === 'in_progress') {
      driverProgress.value = 1.0;
      driverProgress.value = withTiming(1.95, { duration: 60000, easing: Easing.linear });
    }
  }, [ride?.status]);

  const driverCoord = useMemo(() => {
    if (!pickupCoord || !dropCoord || !ride) return null;
    if (ride.status === 'accepted') {
      // Approaching pickup — stays near pickup with slight drift.
      return {
        latitude: pickupCoord.lat - 0.0025,
        longitude: pickupCoord.lng - 0.0025,
      };
    }
    if (ride.status === 'in_progress') {
      // Halfway between pickup and drop.
      return {
        latitude: (pickupCoord.lat + dropCoord.lat) / 2,
        longitude: (pickupCoord.lng + dropCoord.lng) / 2,
      };
    }
    return null;
  }, [pickupCoord, dropCoord, ride?.status]);

  if (!hydrated) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.fullCenter}>
          <ActivityIndicator size="large" color={Brand.gold} />
        </View>
      </ThemedView>
    );
  }

  if (!ride || ride.status === 'rated' || ride.status === 'cancelled') {
    // Effect above handles the redirect; render a brief placeholder.
    return (
      <ThemedView style={styles.container}>
        <View style={styles.fullCenter}>
          <ActivityIndicator size="small" color={Brand.beigeMuted} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapArea}>
        {initialRegion ? (
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            customMapStyle={darkMap.customMapStyle}
            onMapReady={darkMap.onMapReady}
            initialRegion={initialRegion}
            pointerEvents="none"
          >
            {pickupCoord ? (
              <Marker
                coordinate={{ latitude: pickupCoord.lat, longitude: pickupCoord.lng }}
                pinColor="red"
                title="Pickup"
              />
            ) : null}
            {dropCoord ? (
              <Marker
                coordinate={{ latitude: dropCoord.lat, longitude: dropCoord.lng }}
                pinColor="green"
                title="Drop"
              />
            ) : null}
            {route?.segments.map((seg, i) => (
              <Polyline
                key={i}
                coordinates={seg.coords.map((c) => ({ latitude: c.lat, longitude: c.lng }))}
                strokeColor={TRAFFIC_COLORS[seg.speed]}
                strokeWidth={5}
              />
            ))}
            {driverCoord ? (
              <Marker coordinate={driverCoord} title={ride.driver?.name ?? 'Driver'}>
                <View style={styles.driverPin}>
                  <MaterialIcons name="directions-car" size={18} color={Brand.burgundy} />
                </View>
              </Marker>
            ) : null}
          </MapView>
        ) : null}

        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={styles.back}
          hitSlop={8}
        >
          <MaterialIcons name="close" size={22} color={Brand.beige} />
        </Pressable>

        <StatusPill ride={ride} />
      </View>

      <View style={styles.sheet}>
        {ride.status === 'requested' || ride.status === 'dispatching' ? (
          <SearchingPanel ride={ride} />
        ) : ride.status === 'accepted' ? (
          <AcceptedPanel ride={ride} otp={otp} />
        ) : ride.status === 'in_progress' ? (
          <InProgressPanel ride={ride} />
        ) : null}
      </View>
    </ThemedView>
  );
}

// --- Status pill (top-right of map) ----------------------------------------

function StatusPill({ ride }: { ride: RideDoc }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const text =
    ride.status === 'requested'
      ? 'Searching for drivers'
      : ride.status === 'dispatching'
        ? 'Connecting you to a driver'
        : ride.status === 'accepted'
          ? `Driver on the way · ${ride.durationMin > 0 ? Math.max(2, Math.round(ride.durationMin / 6)) : 4} min`
          : ride.status === 'in_progress'
            ? `Ride in progress · ${ride.durationMin || 30} min to drop`
            : 'Ride';

  const color =
    ride.status === 'in_progress' ? '#5BD2A2' : Brand.gold;

  return (
    <View style={[styles.statusPill, { borderColor: color }]}>
      <Animated.View style={[styles.statusDot, { backgroundColor: color }, pulseStyle]} />
      <ThemedText style={styles.statusText}>{text}</ThemedText>
    </View>
  );
}

// --- Searching panel (status: requested | dispatching) --------------------

function SearchingPanel({ ride }: { ride: RideDoc }) {
  // Three staggered pulsing dots — hooks must be at top level, can't .map them.
  const d1 = useSharedValue(0.3);
  const d2 = useSharedValue(0.3);
  const d3 = useSharedValue(0.3);
  const dots = [d1, d2, d3];
  useEffect(() => {
    const repeat = (v: typeof d1) => {
      v.value = withRepeat(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    };
    repeat(d1);
    repeat(d2);
    repeat(d3);
  }, [d1, d2, d3]);

  const message =
    ride.status === 'requested'
      ? 'Reading your request — finding the closest driver near you.'
      : ride.agentStep === 'searching'
        ? `Searching for online drivers near ${ride.pickup.name}…`
        : ride.agentStep === 'found'
          ? `Found a nearby driver — connecting now.`
          : 'Connecting you to a driver…';

  return (
    <Animated.View entering={FadeIn.duration(280)} layout={Layout.duration(180)}>
      <View style={styles.searchHeader}>
        <View style={styles.dotsRow}>
          {dots.map((v, i) => (
            <AnimatedDot key={i} progress={v} delay={i * 200} />
          ))}
        </View>
        <ThemedText type="title" style={styles.searchTitle}>
          Looking for your ride…
        </ThemedText>
        <ThemedText style={styles.searchSub}>{message}</ThemedText>
      </View>

      <View style={styles.routeMini}>
        <View style={styles.routeMiniRow}>
          <View style={[styles.routeDot, { backgroundColor: '#5BD2A2' }]} />
          <ThemedText style={styles.routeMiniText} numberOfLines={1}>
            {ride.pickup.name}
          </ThemedText>
        </View>
        <View style={styles.routeMiniRow}>
          <View style={[styles.routeDot, { backgroundColor: Brand.gold }]} />
          <ThemedText style={styles.routeMiniText} numberOfLines={1}>
            {ride.drop.name}
          </ThemedText>
        </View>
        <ThemedText style={styles.routeMiniMeta}>
          {ride.distanceKm.toFixed(1)} km · ₹{ride.fareInr} · {ride.vehicleType === 'auto' ? 'Auto' : 'Bike Taxi'}
        </ThemedText>
      </View>

      <View style={styles.assurance}>
        <MaterialIcons name="shield" size={14} color={Brand.gold} />
        <ThemedText style={styles.assuranceText}>
          A live Kyra agent is dispatching this trip — every ride is hand-assigned for your safety.
        </ThemedText>
      </View>
    </Animated.View>
  );
}

function AnimatedDot({ progress, delay }: { progress: ReturnType<typeof useSharedValue<number>>; delay: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + progress.value * 0.4 }],
  }));
  return <Animated.View style={[styles.bigDot, style]} />;
}

// --- Accepted panel (status: accepted) -------------------------------------

function AcceptedPanel({ ride, otp }: { ride: RideDoc; otp: string | null }) {
  const driver = ride.driver;

  return (
    <>
      <Animated.View entering={FadeInUp.duration(280)} style={styles.otpCard}>
        <ThemedText style={styles.otpLabel}>Share this OTP with your driver</ThemedText>
        <ThemedText type="title" style={styles.otpCode}>
          {otp ? otp.split('').join(' ') : '· · · ·'}
        </ThemedText>
        <ThemedText style={styles.otpSub}>
          Driver only starts the ride after you tell them this code.
        </ThemedText>
      </Animated.View>

      {driver ? (
        <Animated.View entering={FadeInUp.duration(280).delay(60)} style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <MaterialIcons name="person" size={28} color={Brand.burgundyDark} />
          </View>
          <View style={styles.driverText}>
            <ThemedText type="defaultSemiBold">{driver.name}</ThemedText>
            <ThemedText style={styles.driverSub}>{driver.vehicle}</ThemedText>
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={14} color={Brand.gold} />
              <ThemedText style={styles.ratingText}>{driver.rating.toFixed(1)}</ThemedText>
              <ThemedText style={styles.fareText}>
                · {ride.distanceKm.toFixed(1)} km · ₹{ride.fareInr}
              </ThemedText>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.85 }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <MaterialIcons name="call" size={20} color={Brand.burgundyDark} />
          </Pressable>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInUp.duration(280).delay(120)} style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.action, styles.sosAction, pressed && styles.actionPressed]}
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.push('/safety');
          }}
        >
          <MaterialIcons name="emergency" size={22} color={Brand.beige} />
          <ThemedText style={styles.sosLabel}>SOS</ThemedText>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <MaterialIcons name="ios-share" size={22} color={Brand.beige} />
          <ThemedText style={styles.actionLabel}>Share trip</ThemedText>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <MaterialIcons name="cancel" size={22} color={Brand.beige} />
          <ThemedText style={styles.actionLabel}>Cancel</ThemedText>
        </Pressable>
      </Animated.View>
    </>
  );
}

// --- In-progress panel (status: in_progress) -------------------------------

function InProgressPanel({ ride }: { ride: RideDoc }) {
  const driver = ride.driver;
  return (
    <>
      <Animated.View entering={FadeInUp.duration(280)} style={styles.startedCard}>
        <View style={styles.startedTopRow}>
          <View style={[styles.statusDot, { backgroundColor: '#5BD2A2' }]} />
          <ThemedText type="defaultSemiBold" style={styles.startedTitle}>
            Ride started
          </ThemedText>
          <ThemedText style={styles.startedEta}>
            ETA · {ride.durationMin || 30} min
          </ThemedText>
        </View>
        <View style={styles.startedRouteRow}>
          <View style={[styles.routeDot, { backgroundColor: '#5BD2A2' }]} />
          <ThemedText style={styles.startedRouteText} numberOfLines={1}>
            {ride.pickup.name}
          </ThemedText>
        </View>
        <View style={styles.startedRouteRow}>
          <View style={[styles.routeDot, { backgroundColor: Brand.gold }]} />
          <ThemedText style={styles.startedRouteText} numberOfLines={1}>
            {ride.drop.name}
          </ThemedText>
        </View>
      </Animated.View>

      {driver ? (
        <Animated.View entering={FadeInUp.duration(280).delay(60)} style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <MaterialIcons name="person" size={28} color={Brand.burgundyDark} />
          </View>
          <View style={styles.driverText}>
            <ThemedText type="defaultSemiBold">{driver.name}</ThemedText>
            <ThemedText style={styles.driverSub}>{driver.vehicle}</ThemedText>
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={14} color={Brand.gold} />
              <ThemedText style={styles.ratingText}>{driver.rating.toFixed(1)}</ThemedText>
              <ThemedText style={styles.fareText}>
                · {ride.distanceKm.toFixed(1)} km · ₹{ride.fareInr}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInUp.duration(280).delay(120)} style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.action, styles.sosAction, pressed && styles.actionPressed]}
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.push('/safety');
          }}
        >
          <MaterialIcons name="emergency" size={22} color={Brand.beige} />
          <ThemedText style={styles.sosLabel}>SOS</ThemedText>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <MaterialIcons name="ios-share" size={22} color={Brand.beige} />
          <ThemedText style={styles.actionLabel}>Share trip</ThemedText>
        </Pressable>
      </Animated.View>

      <ThemedText style={styles.waitingHint}>
        Driver will end the ride when you reach. Sit back, hydrate.
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapArea: { flex: 1, backgroundColor: Brand.burgundyDark },
  back: {
    position: 'absolute',
    top: 56,
    left: 16,
    padding: 8,
    backgroundColor: Brand.burgundy,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  statusPill: {
    position: 'absolute',
    top: 56,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Brand.burgundy,
    borderWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12 },

  driverPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Brand.beige,
  },

  sheet: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Brand.burgundyLight,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    gap: 14,
  },

  // Searching panel
  searchHeader: { alignItems: 'center', gap: 8, paddingTop: 6 },
  dotsRow: { flexDirection: 'row', gap: 8, height: 14, alignItems: 'center' },
  bigDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Brand.gold,
  },
  searchTitle: { fontSize: 22, color: Brand.beige },
  searchSub: { color: Brand.beigeMuted, fontSize: 13, textAlign: 'center', maxWidth: 340 },
  routeMini: {
    marginTop: 12,
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundy,
    borderWidth: 1,
    borderColor: Brand.border,
    gap: 6,
  },
  routeMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeMiniText: { flex: 1, fontSize: 13, color: Brand.beige },
  routeMiniMeta: { fontSize: 12, color: Brand.beigeMuted, marginTop: 4, paddingLeft: 18 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  assurance: {
    marginTop: 8,
    padding: 10,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.burgundyLight,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  assuranceText: { flex: 1, fontSize: 11, color: Brand.beigeMuted, lineHeight: 15 },

  // OTP card
  otpCard: {
    padding: 16,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundy,
    borderWidth: 1,
    borderColor: Brand.gold,
    alignItems: 'center',
    gap: 4,
  },
  otpLabel: { fontSize: 12, color: Brand.beigeMuted, letterSpacing: 0.5 },
  otpCode: { color: Brand.gold, letterSpacing: 8, fontSize: 32 },
  otpSub: { fontSize: 11, color: Brand.beigeMuted, textAlign: 'center', marginTop: 4 },

  // Driver card (shared)
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundy,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverText: { flex: 1 },
  driverSub: { fontSize: 12, color: Brand.beigeMuted, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 12, color: Brand.gold },
  fareText: { fontSize: 12, color: Brand.beigeMuted },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Actions row (shared)
  actionsRow: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.burgundy,
  },
  sosAction: { borderColor: '#B33A3A', backgroundColor: '#3A0E12' },
  actionPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  sosLabel: { fontSize: 13, fontWeight: '600', color: '#F4B7B7' },
  actionLabel: { fontSize: 13 },

  // In-progress
  startedCard: {
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundy,
    borderWidth: 1,
    borderColor: '#5BD2A2',
    gap: 6,
  },
  startedTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  startedTitle: { color: Brand.beige, fontSize: 16, flex: 1 },
  startedEta: { color: '#5BD2A2', fontSize: 13, letterSpacing: 0.5 },
  startedRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  startedRouteText: { flex: 1, fontSize: 13, color: Brand.beige },
  waitingHint: { textAlign: 'center', color: Brand.beigeMuted, fontSize: 12, marginTop: 4 },
});
