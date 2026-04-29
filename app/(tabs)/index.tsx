import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDarkMapReady } from '@/constants/map-style';
import { Brand } from '@/constants/theme';
import { refreshCurrentLocation, useCurrentLocation } from '@/services/location';
import { type Place } from '@/services/maps';
import {
  HOME_SLOT,
  WORK_SLOT,
  hydratePlaces,
  useHydrated,
  useRecents,
  useSaved,
  type SavedSlot,
} from '@/services/places';
import { isOnboarded } from '@/services/demo-state';
import { setDrop, setPickup, setRoute } from '@/services/trip';

// Bengaluru centroid — used as a final fallback view while GPS is loading
// or denied. We never use this as a "real" pickup; rider must set one.
const BLR_FALLBACK = { latitude: 12.9716, longitude: 77.5946 };
const DEFAULT_DELTA = 0.04;

export default function RideHomeScreen() {
  const darkMap = useDarkMapReady();
  const hydrated = useHydrated();
  const recents = useRecents();
  const saved = useSaved();
  const location = useCurrentLocation();
  const mapRef = useRef<MapView | null>(null);
  const followedRef = useRef(false); // first-time auto-pan guard

  // Demo: every fresh app launch lands on /sign-up. The flag is in-memory, so
  // a reload (or Expo Go restart) resets it. Once onboarding completes the
  // rider returns here normally.
  useEffect(() => {
    if (!isOnboarded()) {
      router.replace('/sign-up');
    }
  }, []);

  useEffect(() => {
    void hydratePlaces();
  }, []);

  // When GPS resolves for the first time, animate the camera to it.
  useEffect(() => {
    if (location.status === 'ready' && location.place && !followedRef.current) {
      followedRef.current = true;
      mapRef.current?.animateToRegion(
        {
          latitude: location.place.coord.lat,
          longitude: location.place.coord.lng,
          latitudeDelta: DEFAULT_DELTA,
          longitudeDelta: DEFAULT_DELTA,
        },
        500,
      );
    }
  }, [location.status, location.place]);

  const home = saved.find((s) => s.id === HOME_SLOT);
  const work = saved.find((s) => s.id === WORK_SLOT);
  const customSaved = saved.filter((s) => s.id !== HOME_SLOT && s.id !== WORK_SLOT);

  const goToVehiclesWith = (drop: Place) => {
    if (!location.place) {
      // No GPS yet — push the rider into destination so she can set pickup.
      router.push({ pathname: '/destination', params: { presetDrop: drop.id } });
      return;
    }
    void Haptics.selectionAsync();
    setPickup(location.place);
    setDrop(drop);
    setRoute(null);
    router.push('/vehicles');
  };

  const onShortcut = (slot: SavedSlot | undefined, slotId: string, label: string) => {
    if (slot) {
      goToVehiclesWith(slot.place);
    } else {
      router.push({
        pathname: '/destination',
        params: { saveTo: slotId, saveLabel: label },
      });
    }
  };

  const recenter = () => {
    void Haptics.selectionAsync();
    if (location.place) {
      mapRef.current?.animateToRegion(
        {
          latitude: location.place.coord.lat,
          longitude: location.place.coord.lng,
          latitudeDelta: DEFAULT_DELTA,
          longitudeDelta: DEFAULT_DELTA,
        },
        400,
      );
    } else {
      void refreshCurrentLocation();
    }
  };

  const initialRegion: Region = {
    latitude: location.place?.coord.lat ?? BLR_FALLBACK.latitude,
    longitude: location.place?.coord.lng ?? BLR_FALLBACK.longitude,
    latitudeDelta: DEFAULT_DELTA,
    longitudeDelta: DEFAULT_DELTA,
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapArea}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          customMapStyle={darkMap.customMapStyle}
          onMapReady={darkMap.onMapReady}
          initialRegion={initialRegion}
          showsMyLocationButton={false}
          showsUserLocation={location.status === 'ready'}
          showsCompass={false}
          toolbarEnabled={false}
          zoomEnabled
          scrollEnabled
          rotateEnabled
          pitchEnabled={false}
        >
          {location.place ? (
            <Marker
              coordinate={{
                latitude: location.place.coord.lat,
                longitude: location.place.coord.lng,
              }}
              pinColor="red"
              title="You are here"
            />
          ) : null}
        </MapView>

        {location.status === 'denied' || location.status === 'unavailable' ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.permBanner}>
            <MaterialIcons name="location-off" size={16} color={Brand.gold} />
            <ThemedText style={styles.permBannerText}>
              {location.status === 'denied'
                ? 'Location is off — set your pickup in the next screen.'
                : 'Couldn’t get your location — set pickup manually.'}
            </ThemedText>
            <Pressable hitSlop={6} onPress={recenter}>
              <ThemedText style={styles.permBannerAction}>Retry</ThemedText>
            </Pressable>
          </Animated.View>
        ) : null}

        <Pressable
          onPress={recenter}
          style={({ pressed }) => [styles.recenterFab, pressed && styles.pressedDim]}
          hitSlop={6}
          accessibilityLabel="Recenter on my location"
        >
          {location.status === 'loading' ? (
            <MaterialIcons name="my-location" size={20} color={Brand.beigeMuted} />
          ) : (
            <MaterialIcons
              name={location.status === 'ready' ? 'my-location' : 'location-searching'}
              size={20}
              color={Brand.gold}
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={({ pressed }) => [styles.searchBar, pressed && styles.searchBarPressed]}
          onPress={() => router.push('/destination')}
          android_ripple={{ color: Brand.burgundyDark, borderless: false }}
        >
          <MaterialIcons name="search" size={20} color={Brand.beigeMuted} />
          <ThemedText style={styles.searchPlaceholder}>Where are you going?</ThemedText>
        </Pressable>

        <View style={styles.shortcutRow}>
          <Shortcut
            icon="home"
            label="Home"
            sub={home?.place.name}
            onPress={() => onShortcut(home, HOME_SLOT, 'Home')}
          />
          <Shortcut
            icon="work-outline"
            label="Work"
            sub={work?.place.name}
            onPress={() => onShortcut(work, WORK_SLOT, 'Work')}
          />
          <Shortcut icon="add" label="Saved" onPress={() => router.push('/favorites')} />
        </View>

        {customSaved.length > 0 ? (
          <View style={styles.savedRow}>
            {customSaved.map((s) => (
              <Pressable
                key={s.id}
                style={({ pressed }) => [styles.savedChip, pressed && styles.pressedDim]}
                onPress={() => goToVehiclesWith(s.place)}
              >
                <MaterialIcons name="star" size={14} color={Brand.gold} />
                <ThemedText style={styles.savedChipLabel} numberOfLines={1}>
                  {s.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
          {recents.length > 0 ? 'Recent' : 'Suggested'}
        </ThemedText>

        {!hydrated ? (
          <View style={styles.skeletonGroup}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonTextWrap}>
                  <View style={[styles.skeletonBar, { width: '60%' }]} />
                  <View style={[styles.skeletonBar, { width: '40%', marginTop: 6 }]} />
                </View>
              </View>
            ))}
          </View>
        ) : recents.length > 0 ? (
          recents.map((p, i) => (
            <Animated.View
              key={p.id}
              entering={FadeInDown.duration(220).delay(i * 30)}
              layout={Layout.duration(180)}
            >
              <Pressable
                style={({ pressed }) => [styles.recent, pressed && styles.recentPressed]}
                onPress={() => goToVehiclesWith(p)}
                android_ripple={{ color: Brand.burgundyLight, borderless: false }}
              >
                <MaterialIcons
                  name="history"
                  size={22}
                  color={Brand.beigeMuted}
                  style={styles.recentIcon}
                />
                <View style={styles.recentText}>
                  <ThemedText numberOfLines={1}>{p.name}</ThemedText>
                  {p.address ? (
                    <ThemedText style={styles.recentSub} numberOfLines={1}>
                      {p.address}
                    </ThemedText>
                  ) : null}
                </View>
                <MaterialIcons name="north-east" size={18} color={Brand.beigeMuted} />
              </Pressable>
            </Animated.View>
          ))
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={styles.emptyHint}>
            <ThemedText style={styles.emptyHintText}>
              Search for a place — it’ll show up here next time.
            </ThemedText>
          </Animated.View>
        )}

        <View style={styles.bannerCard}>
          <ThemedText type="defaultSemiBold" style={styles.bannerTitle}>
            Every rider and driver, a verified woman.
          </ThemedText>
          <ThemedText style={styles.bannerSub}>
            Aadhaar + selfie verified. Bengaluru only.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

type ShortcutProps = {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  sub?: string;
  onPress: () => void;
};

function Shortcut({ icon, label, sub, onPress }: ShortcutProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.shortcut, pressed && styles.pressedDim]}
      onPress={onPress}
      android_ripple={{ color: Brand.burgundy, borderless: false }}
    >
      <MaterialIcons name={icon} size={20} color={Brand.beige} />
      <View style={styles.shortcutText}>
        <ThemedText style={styles.shortcutLabel}>{label}</ThemedText>
        {sub ? (
          <ThemedText style={styles.shortcutSub} numberOfLines={1}>
            {sub}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.burgundy,
  },
  mapArea: {
    height: 240,
    backgroundColor: Brand.burgundyDark,
    borderBottomWidth: 1,
    borderBottomColor: Brand.burgundyLight,
    overflow: 'hidden',
  },
  permBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Brand.burgundy,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.gold,
  },
  permBannerText: {
    flex: 1,
    fontSize: 12,
    color: Brand.beige,
  },
  permBannerAction: {
    fontSize: 12,
    color: Brand.gold,
    fontWeight: '600',
  },
  recenterFab: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.burgundy,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    flex: 1,
  },
  sheetContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  searchBarPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.997 }],
  },
  searchPlaceholder: {
    color: Brand.beigeMuted,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.border,
    minHeight: 48,
  },
  shortcutText: {
    flexShrink: 1,
  },
  shortcutLabel: {
    fontSize: 14,
  },
  shortcutSub: {
    fontSize: 11,
    color: Brand.beigeMuted,
    marginTop: 1,
  },
  pressedDim: {
    opacity: 0.7,
  },
  savedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Brand.burgundyLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.border,
    maxWidth: 200,
  },
  savedChipLabel: {
    fontSize: 13,
  },
  sectionLabel: {
    marginTop: 8,
    color: Brand.beigeMuted,
  },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentPressed: {
    opacity: 0.6,
  },
  recentIcon: {
    marginRight: 12,
  },
  recentText: {
    flex: 1,
  },
  recentSub: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 2,
  },
  emptyHint: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  emptyHintText: {
    fontSize: 13,
    color: Brand.beigeMuted,
  },
  skeletonGroup: {
    gap: 8,
    paddingVertical: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  skeletonIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Brand.burgundyLight,
    marginRight: 12,
  },
  skeletonTextWrap: {
    flex: 1,
  },
  skeletonBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Brand.burgundyLight,
  },
  bannerCard: {
    marginTop: 12,
    padding: 14,
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.gold,
    gap: 4,
  },
  bannerTitle: {
    color: Brand.gold,
  },
  bannerSub: {
    fontSize: 13,
    color: Brand.beigeMuted,
  },
});
