import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { FadeIn, FadeInUp, Layout } from 'react-native-reanimated';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TRAFFIC_COLORS, useDarkMapReady } from '@/constants/map-style';
import { Brand } from '@/constants/theme';
import { calculateFare } from '@/services/fare';
import { route as fetchRoute } from '@/services/maps';
import { createRide } from '@/services/ride-firestore';
import { setRoute, useTrip } from '@/services/trip';

type VehicleId = 'auto' | 'bike';

const vehicles: {
  id: VehicleId;
  label: string;
  etaMin: number;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  { id: 'auto', label: 'Auto', etaMin: 4, icon: 'directions-car' },
  { id: 'bike', label: 'Bike Taxi', etaMin: 3, icon: 'two-wheeler' },
];

export default function VehiclesScreen() {
  const { pickup, drop, route } = useTrip();
  const [selected, setSelected] = useState<VehicleId>('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const darkMap = useDarkMapReady();

  useEffect(() => {
    if (!pickup || !drop) return;
    if (route) return; // already fetched
    setLoading(true);
    setError(null);
    fetchRoute(pickup.coord, drop.coord)
      .then((r) => setRoute(r))
      .catch(() => setError('Could not load route. Showing flat-rate fare.'))
      .finally(() => setLoading(false));
  }, [pickup, drop, route]);

  const distanceKm = route?.distanceKm ?? 0;
  const fare = useMemo(() => calculateFare(distanceKm), [distanceKm]);
  const selectedVehicle = vehicles.find((v) => v.id === selected) ?? vehicles[0];

  const initialRegion = useMemo(() => {
    if (!pickup) return undefined;
    const lats = [pickup.coord.lat, drop?.coord.lat ?? pickup.coord.lat];
    const lngs = [pickup.coord.lng, drop?.coord.lng ?? pickup.coord.lng];
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const dLat = Math.max(0.02, (Math.max(...lats) - Math.min(...lats)) * 1.6);
    const dLng = Math.max(0.02, (Math.max(...lngs) - Math.min(...lngs)) * 1.6);
    return { latitude: midLat, longitude: midLng, latitudeDelta: dLat, longitudeDelta: dLng };
  }, [pickup, drop]);

  if (!pickup || !drop) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.empty}>
          <ThemedText style={styles.emptyText}>Pick a destination first.</ThemedText>
          <BrandButton title="Choose destination" onPress={() => router.replace('/destination')} />
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
            <Marker
              coordinate={{ latitude: pickup.coord.lat, longitude: pickup.coord.lng }}
              pinColor="red"
              title="Pickup"
            />
            <Marker
              coordinate={{ latitude: drop.coord.lat, longitude: drop.coord.lng }}
              pinColor="green"
              title="Drop"
            />
            {route?.segments.map((seg, i) => (
              <Polyline
                key={i}
                coordinates={seg.coords.map((c) => ({ latitude: c.lat, longitude: c.lng }))}
                strokeColor={TRAFFIC_COLORS[seg.speed]}
                strokeWidth={5}
              />
            ))}
          </MapView>
        ) : null}

        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={Brand.beige} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={FadeInUp.duration(220)}
          layout={Layout.duration(180)}
          style={styles.routeSummary}
        >
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: Brand.gold }]} />
            <ThemedText style={styles.routeText} numberOfLines={1}>{pickup.name}</ThemedText>
          </View>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: Brand.beige }]} />
            <ThemedText style={styles.routeText} numberOfLines={1}>{drop.name}</ThemedText>
          </View>
          {route ? (
            <Animated.View entering={FadeIn.duration(220)}>
              <ThemedText style={styles.routeMeta}>
                {distanceKm.toFixed(1)} km · {route.durationMin} min
              </ThemedText>
            </Animated.View>
          ) : loading ? (
            <View style={styles.routeLoading}>
              <ActivityIndicator size="small" color={Brand.beigeMuted} />
              <ThemedText style={styles.routeMeta}>Calculating route…</ThemedText>
            </View>
          ) : error ? (
            <ThemedText style={styles.routeMetaWarn}>{error}</ThemedText>
          ) : null}
        </Animated.View>

        <ThemedText type="defaultSemiBold" style={styles.section}>
          Choose a ride
        </ThemedText>

        {vehicles.map((v, i) => {
          const isActive = v.id === selected;
          return (
            <Animated.View
              key={v.id}
              entering={FadeInUp.duration(240).delay(60 + i * 40)}
              layout={Layout.duration(180)}
            >
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelected(v.id);
                }}
                style={({ pressed }) => [
                  styles.option,
                  isActive && styles.optionActive,
                  pressed && styles.optionPressed,
                ]}
                android_ripple={{ color: Brand.burgundy, borderless: false }}
              >
                <View style={styles.optionIconWrap}>
                  <MaterialIcons name={v.icon} size={28} color={Brand.burgundyDark} />
                </View>
                <View style={styles.optionText}>
                  <ThemedText type="defaultSemiBold">{v.label}</ThemedText>
                  <ThemedText style={styles.optionSub}>
                    {v.etaMin} min away · women-driven
                  </ThemedText>
                </View>
                {loading ? (
                  <View style={styles.farePlaceholder} />
                ) : (
                  <ThemedText type="defaultSemiBold" style={styles.fare}>
                    ₹{fare}
                  </ThemedText>
                )}
              </Pressable>
            </Animated.View>
          );
        })}

        <ThemedText style={styles.fareNote}>
          ₹50 base (first 2 km) + ₹20 per additional km
        </ThemedText>

        <View style={styles.payRow}>
          <Pressable style={styles.payChip} onPress={() => router.push('/payment')}>
            <MaterialIcons name="payments" size={18} color={Brand.beige} />
            <ThemedText style={styles.payChipText}>Cash</ThemedText>
            <MaterialIcons name="arrow-drop-down" size={18} color={Brand.beigeMuted} />
          </Pressable>
          <Pressable style={styles.payChip}>
            <MaterialIcons name="local-offer" size={18} color={Brand.beige} />
            <ThemedText style={styles.payChipText}>Offers</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.bookBar}>
        <BrandButton
          title={booking ? 'Booking…' : `Book ${selectedVehicle.label} · ₹${fare}`}
          disabled={booking}
          onPress={async () => {
            if (booking) return;
            setBooking(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await createRide({
                pickup: { name: pickup.name, address: pickup.address, coord: pickup.coord },
                drop: { name: drop.name, address: drop.address, coord: drop.coord },
                vehicleType: selected,
                fareInr: fare,
                distanceKm: route?.distanceKm ?? 0,
                durationMin: route?.durationMin ?? 0,
              });
              router.push('/ride');
            } catch (e) {
              setError(`Could not book ride. ${(e as Error).message}`);
              setBooking(false);
            }
          }}
          style={styles.bookBtn}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.burgundy,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  emptyText: {
    color: Brand.beigeMuted,
  },
  mapArea: {
    height: 240,
    backgroundColor: Brand.burgundyDark,
    borderBottomWidth: 1,
    borderBottomColor: Brand.burgundyLight,
  },
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
  sheet: {
    flex: 1,
  },
  sheetContent: {
    padding: 16,
    gap: 8,
  },
  routeSummary: {
    padding: 12,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.burgundyLight,
    gap: 6,
    marginBottom: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
  },
  routeMeta: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 4,
  },
  routeMetaWarn: {
    fontSize: 12,
    color: '#F4B7B7',
    marginTop: 4,
  },
  routeLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  section: {
    color: Brand.beigeMuted,
    marginTop: 8,
    marginBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.burgundyLight,
  },
  optionActive: {
    borderColor: Brand.gold,
    borderWidth: 2,
  },
  optionPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
  },
  farePlaceholder: {
    width: 56,
    height: 16,
    borderRadius: 4,
    backgroundColor: Brand.burgundyDark,
    opacity: 0.5,
  },
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionSub: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 2,
  },
  fare: {
    fontSize: 16,
  },
  fareNote: {
    fontSize: 11,
    color: Brand.beigeMuted,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  payRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  payChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.burgundyLight,
  },
  payChipText: {
    fontSize: 13,
  },
  bookBar: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Brand.burgundyLight,
    backgroundColor: Brand.burgundy,
  },
  bookBtn: {
    width: '100%',
  },
});
