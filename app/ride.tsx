/**
 * Rider active-ride state machine.
 *
 * Subscribes to the rider's most-recent in-flight ride. Renders different
 * panes based on ride.status:
 *
 *   requested        → "Looking for a driver" + cancel
 *   matched          → matched driver name + vehicle + OTP + "I see them"
 *   driver_arriving  → mutual gender check ("Is the driver a woman?")
 *   pickup_verified  → "Trip starting" — driver about to start
 *   in_trip          → trip-in-progress display (no live polyline yet)
 *   completed        → fare due + payment instructions + "Done"
 *   cancelled_*      → reason + "Book another"
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { Redirect, router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import {
  cancelRide,
  fetchLatestRide,
  subscribeDriverLocation,
  submitRiderGenderCheck,
  type Ride,
} from '@/services/rides';
import { route, type RouteSegment, type SpeedCategory } from '@/services/maps';
import { supabase } from '@/services/supabase';
import type { Profile, Vehicle } from '@/types/database';

interface DriverPos { lat: number; lng: number; recorded_at: string }

interface DriverDetails {
  driver: Profile | null;
  vehicle: Vehicle | null;
}

const ACTIVE_STATUSES: Ride['status'][] = [
  'requested', 'matched', 'driver_arriving', 'pickup_verified', 'in_trip',
];

export default function ActiveRideScreen() {
  const { t } = useTranslation();
  const [ride, setRide]                     = useState<Ride | null>(null);
  const [loaded, setLoaded]                 = useState(false);
  const [driverDetails, setDriverDetails]   = useState<DriverDetails>({ driver: null, vehicle: null });
  const [driverPos, setDriverPos]           = useState<DriverPos | null>(null);
  const [busy, setBusy]                     = useState(false);
  const [matchedVisible, setMatchedVisible] = useState(false);
  const completedRedirected                 = useRef(false);
  const matchedShownRef                     = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetchLatestRide();
      setRide(r);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel('rider_active_ride')
      .on('postgres_changes', { event: '*', schema: 'kyra', table: 'rides' }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  // Live driver-position stream from kyra.ride_locations during in-flight ride.
  useEffect(() => {
    if (!ride || !['matched','driver_arriving','pickup_verified','in_trip'].includes(ride.status)) {
      setDriverPos(null);
      return;
    }
    return subscribeDriverLocation(ride.id, (p) => p && setDriverPos(p));
  }, [ride?.id, ride?.status]);

  // When ride completes, jump to the pay screen exactly once. Pay → Rate.
  useEffect(() => {
    if (ride?.status === 'completed' && !completedRedirected.current) {
      completedRedirected.current = true;
      router.replace(`/pay/${ride.id}` as Parameters<typeof router.replace>[0]);
    }
  }, [ride?.status, ride?.id]);

  // Show full-screen overlay exactly once when a driver accepts the ride.
  useEffect(() => {
    if (ride?.status === 'matched' && !matchedShownRef.current) {
      matchedShownRef.current = true;
      setMatchedVisible(true);
    }
  }, [ride?.status]);

  // When matched, fetch driver profile + vehicle.
  useEffect(() => {
    if (!ride?.driver_id || !ride.vehicle_id) {
      setDriverDetails({ driver: null, vehicle: null });
      return;
    }
    void (async () => {
      const [driverRes, vehicleRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', ride.driver_id!).maybeSingle(),
        supabase.from('vehicles').select('*').eq('id', ride.vehicle_id!).maybeSingle(),
      ]);
      setDriverDetails({
        driver:  (driverRes.data ?? null) as Profile | null,
        vehicle: (vehicleRes.data ?? null) as Vehicle | null,
      });
    })();
  }, [ride?.driver_id, ride?.vehicle_id]);

  if (!loaded) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title={t('ride.title_default')} />
        <View style={styles.center}>
          <ActivityIndicator color={Brand.beige} />
        </View>
      </ThemedView>
    );
  }

  // No active ride → bounce home.
  if (!ride || (!ACTIVE_STATUSES.includes(ride.status) && ride.status !== 'completed' && !ride.status.startsWith('cancelled'))) {
    return <Redirect href="/(tabs)" />;
  }

  const onAnswerGenderCheck = async (answer: 'yes' | 'no') => {
    setBusy(true);
    try { await submitRiderGenderCheck(ride.id, answer); }
    catch (err) { Alert.alert(t('rides.could_not_submit'), err instanceof Error ? err.message : ''); }
    finally     { setBusy(false); }
  };

  const onCancel = async () => {
    Alert.alert(t('ride.cancel_ride'), t('ride.cancel_reason'), [
      { text: t('ride.keep_ride'), style: 'cancel' },
      {
        text: t('common.cancel'), style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try { await cancelRide(ride.id, 'Cancelled by rider before pickup.'); }
          catch (err) { Alert.alert(t('ride.cancel_ride'), err instanceof Error ? err.message : ''); }
          finally     { setBusy(false); }
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <MatchedOverlay
        visible={matchedVisible}
        driverDetails={driverDetails}
        onDismiss={() => setMatchedVisible(false)}
      />
      <ScreenHeader title={titleFor(ride.status, t)} />
      <ScrollView contentContainerStyle={styles.body}>
        {(ride.status === 'matched' || ride.status === 'driver_arriving' || ride.status === 'pickup_verified' || ride.status === 'in_trip') && (
          <LiveMap ride={ride} driverPos={driverPos} />
        )}

        <RideSummary ride={ride} />

        {ride.status === 'requested' && (
          <RequestedView ride={ride} busy={busy} onCancel={onCancel} />
        )}

        {(ride.status === 'matched' || ride.status === 'driver_arriving' || ride.status === 'pickup_verified') && (
          <AcceptedPanel ride={ride} details={driverDetails} onCancel={onCancel} />
        )}

        {ride.status === 'driver_arriving' && (
          <GenderCheckCard ride={ride} busy={busy} onAnswer={onAnswerGenderCheck} />
        )}

        {ride.status === 'pickup_verified' && (
          <View style={styles.banner}>
            <MaterialIcons name="check-circle" size={28} color="#5BD2A2" />
            <ThemedText style={styles.bannerText}>
              {t('ride.both_confirmed_banner')}
            </ThemedText>
          </View>
        )}

        {ride.status === 'in_trip' && (
          <InProgressPanel ride={ride} details={driverDetails} />
        )}

        {ride.status === 'completed' && (
          <CompletedView
            ride={ride}
            onDone={() => router.replace('/(tabs)')}
          />
        )}

        {ride.status.startsWith('cancelled') && (
          <CancelledView
            ride={ride}
            onBookAnother={() => router.replace('/(tabs)')}
          />
        )}
      </ScrollView>
    </ThemedView>
  );
}

function titleFor(s: Ride['status'], t: (k: string) => string): string {
  switch (s) {
    case 'requested':                     return t('ride.title_finding_driver');
    case 'matched':                       return t('ride.ride_status_matched');
    case 'driver_arriving':               return t('ride.ride_status_arriving');
    case 'pickup_verified':               return t('ride.trip_starting');
    case 'in_trip':                       return t('ride.ride_status_in_trip');
    case 'completed':                     return t('ride.completed_title');
    case 'cancelled_by_rider':            return t('ride.ride_status_cancelled');
    case 'cancelled_by_driver':           return t('ride.title_driver_cancelled');
    case 'cancelled_gender_check_failed': return t('ride.title_safety_failed');
    case 'cancelled_no_driver':           return t('ride.title_no_driver');
    default:                              return t('ride.title_default');
  }
}

function parseGeoPoint(loc: unknown, fallback: [number, number] = [77.5946, 12.9716]): [number, number] {
  if (!loc) return fallback;
  if (typeof loc === 'object' && 'coordinates' in (loc as Record<string, unknown>)) {
    const coords = (loc as { coordinates: unknown }).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (Number.isFinite(lng) && Number.isFinite(lat) && (lng !== 0 || lat !== 0)) return [lng, lat];
    }
  }
  if (typeof loc === 'string') {
    const m = loc.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (m) {
      const lng = Number(m[1]);
      const lat = Number(m[2]);
      if (Number.isFinite(lng) && Number.isFinite(lat)) return [lng, lat];
    }
  }
  return fallback;
}

function speedColor(speed: SpeedCategory): string {
  switch (speed) {
    case 'NORMAL':      return '#5BD2A2';
    case 'SLOW':        return '#F5A623';
    case 'TRAFFIC_JAM': return '#E07B7B';
    default:            return Brand.gold;
  }
}

function LiveMap({ ride, driverPos }: { ride: Ride; driverPos: DriverPos | null }) {
  const { t } = useTranslation();
  const pickupCoord = parseGeoPoint(ride.pickup_location);
  const dropCoord   = parseGeoPoint(ride.drop_location);
  const mapRef = useRef<MapView | null>(null);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const lastFetchRef   = useRef<number>(0);
  const fetchTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rider's own live GPS — subscribed continuously while this screen is up.
  // We track THIS not the pickup pin so the map shows where the rider
  // actually is right now, not where she said pickup was. The blue
  // showsUserLocation dot renders this; we also use it for fitToCoordinates.
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;

    void (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        if (req.status !== 'granted') return;
      }
      // Seed with one fast read, then keep updating every 5s / 5m.
      try {
        const first = await Location.getLastKnownPositionAsync()
          ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled && first) {
          setRiderPos({ lat: first.coords.latitude, lng: first.coords.longitude });
        }
      } catch {/* ignore */}

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (loc) => {
          if (cancelled) return;
          setRiderPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  // Fetch/refresh the traffic-aware route polyline from driver → target.
  // Re-fetches at most once every 30 s to avoid excessive Routes API calls.
  useEffect(() => {
    if (!driverPos) { setRouteSegments([]); return; }
    const target = ride.status === 'in_trip'
      ? { lat: dropCoord[1],   lng: dropCoord[0] }
      : { lat: pickupCoord[1], lng: pickupCoord[0] };

    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);

    const doFetch = () => {
      lastFetchRef.current = Date.now();
      void route({ lat: driverPos.lat, lng: driverPos.lng }, target)
        .then((r) => setRouteSegments(r.segments))
        .catch(() => {/* silent — map still works without polyline */});
    };

    const elapsed = Date.now() - lastFetchRef.current;
    if (elapsed >= 30_000) {
      doFetch();
    } else {
      fetchTimerRef.current = setTimeout(doFetch, 30_000 - elapsed);
    }
    return () => { if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current); };
  }, [driverPos?.lat, driverPos?.lng, ride.status]);

  // Initial region: fit rider + driver if both known; else rider; else pickup.
  const initialRegion = {
    latitude:  riderPos?.lat ?? pickupCoord[1],
    longitude: riderPos?.lng ?? pickupCoord[0],
    latitudeDelta:  0.012,
    longitudeDelta: 0.012,
  };

  // Dynamic camera — auto-fits whenever the driver or rider position changes.
  // While driver is en route → fit (driver, rider) so you see both, zoomed in.
  // Once in trip → fit (driver, drop) so you see what's ahead.
  useEffect(() => {
    if (!mapRef.current) return;
    const points: { latitude: number; longitude: number }[] = [];
    if (driverPos) points.push({ latitude: driverPos.lat, longitude: driverPos.lng });

    if (ride.status === 'in_trip') {
      points.push({ latitude: dropCoord[1], longitude: dropCoord[0] });
    } else if (riderPos) {
      points.push({ latitude: riderPos.lat, longitude: riderPos.lng });
    } else {
      // Driver hasn't pinged yet, rider GPS not in yet — fall back to pickup.
      points.push({ latitude: pickupCoord[1], longitude: pickupCoord[0] });
    }
    if (points.length < 2) return;

    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 90, right: 60, bottom: 90, left: 60 },
      animated: true,
    });
  }, [
    driverPos?.lat, driverPos?.lng,
    riderPos?.lat,  riderPos?.lng,
    ride.status,
    pickupCoord, dropCoord,
  ]);

  // "X m / km away" pill — measured between driver and the relevant target.
  const meters = driverPos
    ? haversineMeters(
        { lat: driverPos.lat, lng: driverPos.lng },
        ride.status === 'in_trip'
          ? { lat: dropCoord[1], lng: dropCoord[0] }
          : riderPos
            ? { lat: riderPos.lat, lng: riderPos.lng }
            : { lat: pickupCoord[1], lng: pickupCoord[0] },
      )
    : null;

  return (
    <View style={styles.mapWrap}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation        // blue dot at rider's GPS
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {/* Pickup pin only shown until the trip starts */}
        {ride.status !== 'in_trip' && (
          <Marker
            coordinate={{ latitude: pickupCoord[1], longitude: pickupCoord[0] }}
            title={t('ride.map_pickup')}
            pinColor="#5BD2A2"
          />
        )}
        {/* Drop pin always shown */}
        <Marker
          coordinate={{ latitude: dropCoord[1], longitude: dropCoord[0] }}
          title={t('ride.map_drop')}
          pinColor="#E07B7B"
        />
        {/* Traffic-aware route polyline — one segment per speed zone */}
        {routeSegments.map((seg, i) => (
          <Polyline
            key={i}
            coordinates={seg.coords.map((c) => ({ latitude: c.lat, longitude: c.lng }))}
            strokeColor={speedColor(seg.speed)}
            strokeWidth={4}
            geodesic
          />
        ))}

        {driverPos && (
          <Marker
            coordinate={{ latitude: driverPos.lat, longitude: driverPos.lng }}
            title={t('ride.map_your_driver')}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.driverDot}>
              <MaterialIcons name="local-taxi" size={18} color={Brand.burgundyDark} />
            </View>
          </Marker>
        )}
      </MapView>

      {meters !== null && (
        <View style={styles.distancePill}>
          <ThemedText style={styles.distanceText}>
            {ride.status === 'in_trip'
              ? `${meters >= 1000 ? `${(meters/1000).toFixed(1)} km` : `${Math.round(meters)} m`} ${t('ride.distance_to_drop_suffix')}`
              : `${meters >= 1000 ? `${(meters/1000).toFixed(1)} km` : `${Math.round(meters)} m`} ${t('ride.distance_away_suffix')}`}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function RideSummary({ ride }: { ride: Ride }) {
  return (
    <View style={styles.rideCard}>
      <ThemedText style={styles.fare}>₹{Number(ride.fare_inr).toFixed(0)}</ThemedText>
      <ThemedText style={styles.addr}>↑ {ride.pickup_address}</ThemedText>
      <ThemedText style={styles.addr}>↓ {ride.drop_address}</ThemedText>
    </View>
  );
}

function RequestedView({
  ride,
  busy,
  onCancel,
}: {
  ride: Ride;
  busy: boolean;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeIn.duration(280)} layout={Layout.duration(180)}>
      <View style={styles.searchHeader}>
        <RadarPulse />
        <ThemedText type="title" style={styles.searchTitle}>
          {t('ride.looking_title')}
        </ThemedText>
        <ThemedText style={styles.searchSub}>
          {t('ride.looking_body')}
        </ThemedText>
      </View>

      <View style={styles.routeMini}>
        <View style={styles.routeMiniRow}>
          <View style={[styles.routeDot, { backgroundColor: '#5BD2A2' }]} />
          <ThemedText style={styles.routeMiniText} numberOfLines={1}>
            {ride.pickup_address}
          </ThemedText>
        </View>
        <View style={styles.routeMiniRow}>
          <View style={[styles.routeDot, { backgroundColor: Brand.gold }]} />
          <ThemedText style={styles.routeMiniText} numberOfLines={1}>
            {ride.drop_address}
          </ThemedText>
        </View>
        <ThemedText style={styles.routeMiniMeta}>
          ₹{Number(ride.fare_inr).toFixed(0)}
        </ThemedText>
      </View>

      <View style={styles.assurance}>
        <MaterialIcons name="shield" size={14} color={Brand.gold} />
        <ThemedText style={styles.assuranceText}>
          {t('ride.assurance')}
        </ThemedText>
      </View>

      <Pressable onPress={onCancel} disabled={busy} style={styles.cancelBtn}>
        <ThemedText style={styles.cancelBtnText}>{t('ride.cancel_ride')}</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

// Radar pulse — three concentric gold rings expand outward from a steady
// center dot, staggered 0/800/1600ms. Restored from the original Firestore
// version of this screen so the "looking for a driver" pause matches the
// original product feel.
function RadarPulse() {
  return (
    <View style={styles.radarContainer}>
      <View style={styles.radarCenter} />
      <RadarRing delay={0} />
      <RadarRing delay={800} />
      <RadarRing delay={1600} />
    </View>
  );
}

function RadarRing({ delay }: { delay: number }) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, [delay, sv]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.25 + sv.value * 1.55 }],
    opacity: Math.max(0, 0.85 - sv.value),
  }));
  return <Animated.View style={[styles.radarRing, style]} />;
}

/**
 * Restored from the original Firestore-era ride.tsx (commit c46cc49):
 * a separate gold-bordered OTP card on top, a driver row with avatar +
 * name + vehicle + fare, an action row with SOS / Share trip / Cancel.
 * Wired to Supabase: name + phone come from joined profiles, vehicle line
 * comes from the joined vehicles row, OTP comes from kyra.rides.ride_otp.
 */
function AcceptedPanel({
  ride, details, onCancel,
}: {
  ride: Ride;
  details: DriverDetails;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const driver  = details.driver;
  const vehicle = details.vehicle;

  const driverName = driver
    ? `${driver.first_name} ${driver.last_name}`.trim() || t('ride.verified_driver')
    : t('ride.ride_status_matched');

  const vehicleLine = vehicle
    ? `${vehicle.registration_number} · ${vehicle.vehicle_type === 'auto' ? t('vehicles.auto') : vehicle.vehicle_type === 'bike' ? t('vehicles.bike') : t('driver_vehicle.car')}`
    : '';

  return (
    <>
      <Animated.View entering={FadeInUp.duration(280)} style={styles.otpCard}>
        <ThemedText style={styles.otpLabel}>{t('ride.share_otp')}</ThemedText>
        <ThemedText type="title" style={styles.otpCode}>
          {ride.ride_otp ? ride.ride_otp.split('').join(' ') : '· · · ·'}
        </ThemedText>
        <ThemedText style={styles.otpSub}>{t('ride.otp_sub')}</ThemedText>
      </Animated.View>

      {driver ? (
        <Animated.View entering={FadeInUp.duration(280).delay(60)} style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <MaterialIcons name="person" size={28} color={Brand.burgundyDark} />
          </View>
          <View style={styles.driverText}>
            <ThemedText type="defaultSemiBold">{driverName}</ThemedText>
            {vehicleLine ? <ThemedText style={styles.driverSub}>{vehicleLine}</ThemedText> : null}
            <View style={styles.ratingRow}>
              <MaterialIcons name="verified" size={14} color={Brand.gold} />
              <ThemedText style={styles.ratingText}>{t('ride.verified_driver')}</ThemedText>
              <ThemedText style={styles.fareText}>· ₹{Number(ride.fare_inr).toFixed(0)}</ThemedText>
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
          <MaterialIcons name="emergency" size={22} color="#F4B7B7" />
          <ThemedText style={styles.sosLabel}>{t('ride.sos')}</ThemedText>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <MaterialIcons name="ios-share" size={22} color={Brand.beige} />
          <ThemedText style={styles.actionLabel}>{t('ride.share_trip')}</ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          onPress={onCancel}
        >
          <MaterialIcons name="cancel" size={22} color={Brand.beige} />
          <ThemedText style={styles.actionLabel}>{t('ride.cancel')}</ThemedText>
        </Pressable>
      </Animated.View>
    </>
  );
}

function InProgressPanel({ ride, details }: { ride: Ride; details: DriverDetails }) {
  const { t } = useTranslation();
  const driver  = details.driver;
  const vehicle = details.vehicle;
  const driverName = driver
    ? `${driver.first_name} ${driver.last_name}`.trim() || t('ride.verified_driver')
    : t('ride.verified_driver');
  const vehicleLine = vehicle
    ? `${vehicle.registration_number} · ${vehicle.vehicle_type === 'auto' ? t('vehicles.auto') : vehicle.vehicle_type === 'bike' ? t('vehicles.bike') : t('driver_vehicle.car')}`
    : '';

  return (
    <>
      <Animated.View entering={FadeInUp.duration(280)} style={styles.startedCard}>
        <View style={styles.startedTopRow}>
          <View style={[styles.statusDot, { backgroundColor: '#5BD2A2' }]} />
          <ThemedText type="defaultSemiBold" style={styles.startedTitle}>
            {t('ride.ride_started')}
          </ThemedText>
        </View>
        <View style={styles.startedRouteRow}>
          <View style={[styles.routeDot, { backgroundColor: '#5BD2A2' }]} />
          <ThemedText style={styles.startedRouteText} numberOfLines={1}>
            {ride.pickup_address}
          </ThemedText>
        </View>
        <View style={styles.startedRouteRow}>
          <View style={[styles.routeDot, { backgroundColor: Brand.gold }]} />
          <ThemedText style={styles.startedRouteText} numberOfLines={1}>
            {ride.drop_address}
          </ThemedText>
        </View>
      </Animated.View>

      {driver ? (
        <Animated.View entering={FadeInUp.duration(280).delay(60)} style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <MaterialIcons name="person" size={28} color={Brand.burgundyDark} />
          </View>
          <View style={styles.driverText}>
            <ThemedText type="defaultSemiBold">{driverName}</ThemedText>
            {vehicleLine ? <ThemedText style={styles.driverSub}>{vehicleLine}</ThemedText> : null}
            <View style={styles.ratingRow}>
              <MaterialIcons name="verified" size={14} color={Brand.gold} />
              <ThemedText style={styles.ratingText}>{t('ride.verified_driver')}</ThemedText>
              <ThemedText style={styles.fareText}>· ₹{Number(ride.fare_inr).toFixed(0)}</ThemedText>
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
          <MaterialIcons name="emergency" size={22} color="#F4B7B7" />
          <ThemedText style={styles.sosLabel}>{t('ride.sos')}</ThemedText>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <MaterialIcons name="ios-share" size={22} color={Brand.beige} />
          <ThemedText style={styles.actionLabel}>{t('ride.share_trip')}</ThemedText>
        </Pressable>
      </Animated.View>

      <ThemedText style={styles.waitingHint}>{t('ride.waiting_hint')}</ThemedText>
    </>
  );
}

function GenderCheckCard({
  ride, busy, onAnswer,
}: { ride: Ride; busy: boolean; onAnswer: (a: 'yes' | 'no') => void }) {
  const { t } = useTranslation();
  const myAnswer    = ride.rider_driver_check;
  const theirAnswer = ride.driver_woman_check;

  return (
    <View style={styles.checkCard}>
      <ThemedText type="defaultSemiBold" style={styles.checkTitle}>
        {t('ride.is_driver_woman_title')}
      </ThemedText>
      <ThemedText style={styles.checkBody}>{t('ride.is_driver_woman_body')}</ThemedText>

      {myAnswer ? (
        <ThemedText style={styles.dim}>
          {t('ride.your_answer')} <ThemedText type="defaultSemiBold">{myAnswer}</ThemedText>.{' '}
          {theirAnswer
            ? `${t('enter_otp.both_required')}`
            : t('enter_otp.both_required')}
        </ThemedText>
      ) : (
        <View style={styles.checkBtns}>
          <Pressable
            disabled={busy}
            onPress={() => onAnswer('no')}
            style={[styles.checkBtn, styles.checkBtnNo]}
          >
            <ThemedText style={styles.checkBtnText}>{t('ride.no')}</ThemedText>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => onAnswer('yes')}
            style={[styles.checkBtn, styles.checkBtnYes]}
          >
            <ThemedText style={styles.checkBtnTextYes}>{t('ride.yes')}</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function CompletedView({ ride, onDone }: { ride: Ride; onDone: () => void }) {
  const { t } = useTranslation();
  const final = Number(ride.fare_inr_final ?? ride.fare_inr);
  return (
    <View style={styles.completed}>
      <MaterialIcons name="check-circle" size={48} color="#5BD2A2" />
      <ThemedText type="title">{t('ride.completed_title')}</ThemedText>
      <ThemedText style={styles.payDue}>{t('ride.fare_due')} ₹{final.toFixed(0)}</ThemedText>
      <ThemedText style={styles.dim}>{t('ride.waiting_hint')}</ThemedText>
      <BrandButton title={t('common.ok')} onPress={onDone} />
    </View>
  );
}

function CancelledView({ ride, onBookAnother }: { ride: Ride; onBookAnother: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.completed}>
      <MaterialIcons name="cancel" size={48} color="#E07B7B" />
      <ThemedText type="title">{t('ride.ride_status_cancelled')}</ThemedText>
      {ride.cancelled_reason ? (
        <ThemedText style={styles.dim}>{ride.cancelled_reason}</ThemedText>
      ) : null}
      <BrandButton title={t('ride.book_another')} onPress={onBookAnother} />
    </View>
  );
}

function MatchedOverlay({
  visible,
  driverDetails,
  onDismiss,
}: {
  visible: boolean;
  driverDetails: DriverDetails;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const driver  = driverDetails.driver;
  const vehicle = driverDetails.vehicle;
  const driverName = driver
    ? `${driver.first_name} ${driver.last_name}`.trim() || t('ride.verified_driver')
    : t('ride.verified_driver');
  const vehicleLine = vehicle
    ? `${vehicle.make_model} · ${vehicle.registration_number}`
    : '';

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent>
      <View style={matchedStyles.screen}>
        <View style={matchedStyles.iconRing}>
          <MaterialIcons name="local-taxi" size={48} color={Brand.gold} />
        </View>

        <ThemedText type="title" style={matchedStyles.headline}>
          {t('ride.driver_found_title', { defaultValue: 'Driver Found!' })}
        </ThemedText>
        <ThemedText style={matchedStyles.sub}>
          {t('ride.driver_found_body', { defaultValue: 'Your driver is on the way. Share your OTP at pickup.' })}
        </ThemedText>

        <View style={matchedStyles.driverCard}>
          <View style={matchedStyles.avatar}>
            <MaterialIcons name="person" size={32} color={Brand.burgundyDark} />
          </View>
          <View style={matchedStyles.driverInfo}>
            <ThemedText type="defaultSemiBold" style={matchedStyles.driverName}>{driverName}</ThemedText>
            {vehicleLine ? (
              <ThemedText style={matchedStyles.driverSub}>{vehicleLine}</ThemedText>
            ) : null}
            <View style={matchedStyles.verifiedRow}>
              <MaterialIcons name="verified" size={13} color={Brand.gold} />
              <ThemedText style={matchedStyles.verifiedText}>
                {t('ride.verified_driver')}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={matchedStyles.safetyBadge}>
          <MaterialIcons name="shield" size={15} color={Brand.gold} />
          <ThemedText style={matchedStyles.safetyText}>
            {t('ride.assurance')}
          </ThemedText>
        </View>

        <BrandButton
          title={t('ride.driver_found_cta', { defaultValue: "Got it, I'm ready!" })}
          onPress={onDismiss}
          style={matchedStyles.cta}
        />
      </View>
    </Modal>
  );
}

const matchedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.burgundyDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 18,
  },
  iconRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Brand.burgundy,
    borderWidth: 2, borderColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
    shadowColor: Brand.gold, shadowOpacity: 0.5, shadowRadius: 16,
    elevation: 8,
  },
  headline: { color: Brand.beige, fontSize: 28, textAlign: 'center' },
  sub:      { color: Brand.beigeMuted, fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 300 },
  driverCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    width: '100%', padding: 16,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundy,
    borderWidth: 1, borderColor: Brand.gold,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  driverInfo: { flex: 1, gap: 2 },
  driverName: { color: Brand.beige, fontSize: 16 },
  driverSub:  { color: Brand.beigeMuted, fontSize: 12 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  verifiedText: { color: Brand.gold, fontSize: 12 },
  safetyBadge: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    padding: 10, borderRadius: Brand.radius,
    backgroundColor: Brand.burgundy,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Brand.gold,
    width: '100%',
  },
  safetyText: { flex: 1, color: Brand.beigeMuted, fontSize: 11, lineHeight: 16 },
  cta: { width: '100%', marginTop: 8 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body:      { padding: 20, gap: 14 },
  mapWrap: {
    height: 240,
    borderRadius: Brand.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Brand.border,
  },
  map: { flex: 1 },
  driverDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Brand.beige,
  },
  distancePill: {
    position: 'absolute',
    top: 12, alignSelf: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Brand.burgundyDark,
    borderWidth: 1, borderColor: Brand.gold,
  },
  distanceText: { color: Brand.beige, fontSize: 12, letterSpacing: 0.5 },

  // Radar dispatch (status: requested)
  searchHeader: { alignItems: 'center', gap: 8, paddingTop: 6 },
  radarContainer: {
    width: 140, height: 140,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  radarCenter: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Brand.gold,
    zIndex: 2,
    shadowColor: Brand.gold, shadowOpacity: 0.8, shadowRadius: 8,
    elevation: 6,
  },
  radarRing: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: Brand.gold,
  },
  searchTitle: { fontSize: 22, color: Brand.beige, textAlign: 'center' },
  searchSub:   { color: Brand.beigeMuted, fontSize: 13, textAlign: 'center', maxWidth: 340 },
  routeMini: {
    marginTop: 12, padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundy,
    borderWidth: 1, borderColor: Brand.border,
    gap: 6,
  },
  routeMiniRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeMiniText: { flex: 1, fontSize: 13, color: Brand.beige },
  routeMiniMeta: { fontSize: 12, color: Brand.beigeMuted, marginTop: 4, paddingLeft: 18 },
  routeDot:      { width: 8, height: 8, borderRadius: 4 },
  assurance: {
    marginTop: 8, padding: 10,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.burgundyLight,
    flexDirection: 'row', gap: 8, alignItems: 'center',
  },
  assuranceText: { flex: 1, fontSize: 11, color: Brand.beigeMuted, lineHeight: 15 },

  center:    { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
  rideCard: {
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    gap: 6,
  },
  fare:  { color: Brand.gold, fontSize: 24, fontWeight: '700' },
  addr:  { color: Brand.beige, fontSize: 14 },
  muted: { color: Brand.beige, textAlign: 'center', fontSize: 18 },
  dim:   { color: Brand.beigeMuted, textAlign: 'center', fontSize: 13, lineHeight: 19, paddingHorizontal: 8 },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  cancelBtnText: { color: '#E07B7B', textDecorationLine: 'underline' },

  // OTP card (status: matched / driver_arriving / pickup_verified) — restored from original
  otpCard: {
    padding: 16, borderRadius: Brand.radius,
    backgroundColor: Brand.burgundy,
    borderWidth: 1, borderColor: Brand.gold,
    alignItems: 'center', gap: 4,
  },
  otpLabel: { fontSize: 12, color: Brand.beigeMuted, letterSpacing: 0.5 },
  otpCode:  { color: Brand.gold, letterSpacing: 8, fontSize: 32 },
  otpSub:   { fontSize: 11, color: Brand.beigeMuted, textAlign: 'center', marginTop: 4 },

  // Driver card (shared between AcceptedPanel + InProgressPanel)
  driverCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: Brand.radius,
    backgroundColor: Brand.burgundy,
    borderWidth: 1, borderColor: Brand.border,
  },
  driverAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  driverText: { flex: 1 },
  driverSub:  { fontSize: 12, color: Brand.beigeMuted, marginTop: 2 },
  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 12, color: Brand.gold },
  fareText:   { fontSize: 12, color: Brand.beigeMuted },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
  },

  // Action row (SOS / Share / Cancel)
  actionsRow: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 12,
    borderRadius: Brand.radius,
    borderWidth: 1, borderColor: Brand.border,
    backgroundColor: Brand.burgundy,
  },
  sosAction:     { borderColor: '#B33A3A', backgroundColor: '#3A0E12' },
  actionPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  sosLabel:      { fontSize: 13, fontWeight: '600', color: '#F4B7B7' },
  actionLabel:   { fontSize: 13, color: Brand.beige },

  // In-progress panel
  startedCard: {
    padding: 14, borderRadius: Brand.radius,
    backgroundColor: Brand.burgundy,
    borderWidth: 1, borderColor: '#5BD2A2',
    gap: 6,
  },
  startedTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  startedTitle:     { color: Brand.beige, fontSize: 16, flex: 1 },
  startedRouteRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  startedRouteText: { flex: 1, fontSize: 13, color: Brand.beige },
  statusDot:        { width: 8, height: 8, borderRadius: 4 },
  waitingHint:      { textAlign: 'center', color: Brand.beigeMuted, fontSize: 12, marginTop: 4 },
  checkCard: {
    padding: 16,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: '#5BD2A2',
    gap: 10,
  },
  checkTitle: { color: '#5BD2A2', fontSize: 14, letterSpacing: 1 },
  checkBody:  { color: Brand.beige, fontSize: 14, lineHeight: 20 },
  checkBtns:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  checkBtn: {
    flex: 1, paddingVertical: 16, borderRadius: Brand.radius,
    alignItems: 'center', borderWidth: 2,
  },
  checkBtnNo:      { borderColor: '#E07B7B', backgroundColor: 'transparent' },
  checkBtnYes:     { borderColor: '#5BD2A2', backgroundColor: '#5BD2A2' },
  checkBtnText:    { color: '#E07B7B', fontWeight: '700', fontSize: 18 },
  checkBtnTextYes: { color: Brand.burgundy, fontWeight: '700', fontSize: 18 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    borderWidth: 1,
    borderColor: Brand.gold,
  },
  bannerText: { color: Brand.beige, fontSize: 14, flex: 1, lineHeight: 20 },
  completed:  { alignItems: 'center', gap: 12, paddingVertical: 24 },
  payDue:     { color: Brand.gold, fontSize: 28, fontWeight: '700' },
});
