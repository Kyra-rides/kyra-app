import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { refreshCurrentLocation, useCurrentLocation } from '@/services/location';
import { resolvePlace, suggest, type Place, type Suggestion } from '@/services/maps';
import {
  HOME_SLOT,
  WORK_SLOT,
  addRecent,
  hydratePlaces,
  newCustomSlotId,
  setSaved,
  useRecents,
} from '@/services/places';
import { setDrop, setPickup, setRoute, useTrip } from '@/services/trip';

type Mode = 'pickup' | 'drop';

export default function DestinationScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ saveTo?: string; saveLabel?: string }>();
  const saveTo = typeof params.saveTo === 'string' ? params.saveTo : undefined;
  const saveLabel = typeof params.saveLabel === 'string' ? params.saveLabel : undefined;

  const trip = useTrip();
  const location = useCurrentLocation();
  const recents = useRecents();

  // The pickup field shows the currently-set pickup (GPS by default once
  // resolved, or whatever the rider last typed). Editing it switches `mode`
  // to 'pickup' and replaces it with a search.
  const [pickupPlace, setPickupPlace] = useState<Place | null>(trip.pickup ?? null);
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropQuery, setDropQuery] = useState('');
  const [mode, setMode] = useState<Mode>('drop');

  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dropInputRef = useRef<TextInput | null>(null);
  const pickupInputRef = useRef<TextInput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    void hydratePlaces();
  }, []);

  // When GPS resolves and we don't already have a manual pickup, adopt it.
  useEffect(() => {
    if (saveTo) return; // save mode doesn't use pickup at all
    if (location.status === 'ready' && location.place && !pickupPlace) {
      setPickupPlace(location.place);
    }
  }, [location.status, location.place, pickupPlace, saveTo]);

  const activeQuery = mode === 'drop' ? dropQuery : pickupQuery;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (activeQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      try {
        const items = await suggest(activeQuery);
        if (myReq !== reqIdRef.current) return;
        setResults(items);
        setError(items.length === 0 ? t('destination.no_matches') : null);
      } catch (e) {
        if (myReq !== reqIdRef.current) return;
        setError(`Search unavailable. ${(e as Error).message}`);
        setResults([]);
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeQuery]);

  const launchTrip = (pickup: Place, drop: Place) => {
    addRecent(drop);
    setPickup(pickup);
    setDrop(drop);
    setRoute(null);
    void Haptics.selectionAsync();
    Keyboard.dismiss();
    router.replace('/vehicles');
  };

  const resolveAndApply = async (placeId: string) => {
    if (resolvingId) return;
    setResolvingId(placeId);
    setError(null);
    try {
      const place = await resolvePlace(placeId);
      if (saveTo) {
        addRecent(place);
        const icon =
          saveTo === HOME_SLOT ? 'home' : saveTo === WORK_SLOT ? 'work-outline' : 'star-outline';
        setSaved({
          id: saveTo,
          label: saveLabel ?? place.name,
          icon: icon as 'home' | 'work-outline' | 'star-outline',
          place,
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Keyboard.dismiss();
        router.back();
        return;
      }
      if (mode === 'drop') {
        const pickup = pickupPlace ?? location.place;
        if (!pickup) {
          // No pickup yet — switch to pickup mode and prompt the rider.
          setMode('pickup');
          setError(t('destination.set_pickup_first'));
          // Keep the chosen drop in state so we can finish once pickup is set.
          setPendingDrop(place);
          setTimeout(() => pickupInputRef.current?.focus(), 50);
          return;
        }
        launchTrip(pickup, place);
        return;
      }
      // mode === 'pickup'
      setPickupPlace(place);
      addRecent(place);
      void Haptics.selectionAsync();
      // If a drop is already chosen (pendingDrop) — finish the trip now.
      if (pendingDrop) {
        launchTrip(place, pendingDrop);
        setPendingDrop(null);
        return;
      }
      setMode('drop');
      setPickupQuery('');
      setTimeout(() => dropInputRef.current?.focus(), 50);
    } catch (e) {
      setError(`Could not load place. ${(e as Error).message}`);
    } finally {
      setResolvingId(null);
    }
  };

  // A drop chosen before pickup is set; we hold it until pickup lands.
  const [pendingDrop, setPendingDrop] = useState<Place | null>(null);

  const tapRecent = (place: Place) => {
    if (saveTo) {
      addRecent(place);
      const icon =
        saveTo === HOME_SLOT ? 'home' : saveTo === WORK_SLOT ? 'work-outline' : 'star-outline';
      setSaved({
        id: saveTo,
        label: saveLabel ?? place.name,
        icon: icon as 'home' | 'work-outline' | 'star-outline',
        place,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Keyboard.dismiss();
      router.back();
      return;
    }
    if (mode === 'pickup') {
      setPickupPlace(place);
      void Haptics.selectionAsync();
      if (pendingDrop) {
        launchTrip(place, pendingDrop);
        setPendingDrop(null);
        return;
      }
      setMode('drop');
      setPickupQuery('');
      setTimeout(() => dropInputRef.current?.focus(), 50);
      return;
    }
    const pickup = pickupPlace ?? location.place;
    if (!pickup) {
      setPendingDrop(place);
      setMode('pickup');
      setError(t('destination.set_pickup_first'));
      setTimeout(() => pickupInputRef.current?.focus(), 50);
      return;
    }
    launchTrip(pickup, place);
  };

  const useGpsForPickup = () => {
    if (location.status === 'ready' && location.place) {
      setPickupPlace(location.place);
      setPickupQuery('');
      void Haptics.selectionAsync();
      if (pendingDrop) {
        launchTrip(location.place, pendingDrop);
        setPendingDrop(null);
        return;
      }
      setMode('drop');
      setTimeout(() => dropInputRef.current?.focus(), 50);
    } else {
      void refreshCurrentLocation();
    }
  };

  const editPickup = () => {
    setMode('pickup');
    setPickupQuery('');
    setTimeout(() => pickupInputRef.current?.focus(), 50);
  };

  const filteredRecents = useMemo(() => {
    if (activeQuery.trim().length === 0) return recents;
    const q = activeQuery.trim().toLowerCase();
    return recents.filter(
      (r) => r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q),
    );
  }, [recents, activeQuery]);

  const showResults = results.length > 0;
  const showRecents = !showResults && filteredRecents.length > 0;

  const headerTitle = saveTo
    ? t('destination.header_set', { label: saveLabel ?? t('destination.default_address_label') })
    : t('destination.header_where_to');

  // Render helpers ----------------------------------------------------------

  const PickupRow = saveTo ? null : mode === 'pickup' ? (
    <View style={[styles.field, styles.fieldActive]}>
      <View style={[styles.dot, { backgroundColor: Brand.gold }]} />
      <TextInput
        ref={pickupInputRef}
        style={styles.input}
        placeholder={location.place ? location.place.name : t('destination.placeholder_pickup')}
        placeholderTextColor={Brand.beigeMuted}
        value={pickupQuery}
        onChangeText={setPickupQuery}
        onFocus={() => setMode('pickup')}
        autoFocus
        returnKeyType="search"
      />
      {loading && mode === 'pickup' ? (
        <ActivityIndicator size="small" color={Brand.beigeMuted} />
      ) : null}
      {!loading && pickupQuery.length > 0 ? (
        <Pressable onPress={() => setPickupQuery('')} hitSlop={6}>
          <MaterialIcons name="close" size={18} color={Brand.beigeMuted} />
        </Pressable>
      ) : null}
    </View>
  ) : (
    <Pressable
      onPress={editPickup}
      style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
      android_ripple={{ color: Brand.burgundyDark, borderless: false }}
    >
      <View style={[styles.dot, { backgroundColor: Brand.gold }]} />
      <View style={styles.fieldText}>
        {pickupPlace ? (
          <>
            <ThemedText numberOfLines={1} style={styles.fieldValue}>
              {pickupPlace.id === 'current-gps' ? t('destination.current_location') : pickupPlace.name}
            </ThemedText>
            {pickupPlace.address ? (
              <ThemedText numberOfLines={1} style={styles.fieldValueSub}>
                {pickupPlace.address}
              </ThemedText>
            ) : null}
          </>
        ) : location.status === 'loading' || location.status === 'idle' ? (
          <ThemedText style={styles.fieldPlaceholder}>{t('destination.locating_you')}</ThemedText>
        ) : (
          <ThemedText style={styles.fieldPlaceholder}>{t('destination.tap_to_set_pickup')}</ThemedText>
        )}
      </View>
      <MaterialIcons name="edit" size={16} color={Brand.beigeMuted} />
    </Pressable>
  );

  const DropRow = (
    <View
      style={[
        styles.field,
        mode === 'drop' && !saveTo ? styles.fieldActive : null,
      ]}
    >
      {saveTo ? (
        <MaterialIcons name="search" size={18} color={Brand.beigeMuted} />
      ) : (
        <View style={[styles.dot, { backgroundColor: Brand.beige }]} />
      )}
      <TextInput
        ref={dropInputRef}
        style={styles.input}
        placeholder={
          saveTo
            ? t('destination.placeholder_search_save', { label: saveLabel ?? t('destination.default_save_placeholder') })
            : t('destination.placeholder_drop')
        }
        placeholderTextColor={Brand.beigeMuted}
        value={dropQuery}
        onChangeText={setDropQuery}
        onFocus={() => setMode('drop')}
        autoFocus={mode === 'drop'}
        returnKeyType="search"
      />
      {loading && mode === 'drop' ? (
        <ActivityIndicator size="small" color={Brand.beigeMuted} />
      ) : null}
      {!loading && dropQuery.length > 0 ? (
        <Pressable onPress={() => setDropQuery('')} hitSlop={6}>
          <MaterialIcons name="close" size={18} color={Brand.beigeMuted} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.topbar}>
        <Pressable
          onPress={() => {
            if (mode === 'pickup' && !saveTo && pickupPlace) {
              setMode('drop');
              setPickupQuery('');
              return;
            }
            router.back();
          }}
          style={styles.back}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={22} color={Brand.beige} />
        </Pressable>
        <ThemedText type="defaultSemiBold" style={styles.topbarTitle}>
          {headerTitle}
        </ThemedText>
      </View>

      {saveTo ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.saveBanner}>
          <MaterialIcons name="bookmark-border" size={16} color={Brand.gold} />
          <ThemedText style={styles.saveBannerText}>
            {t('destination.save_banner', { label: saveLabel ?? t('destination.default_save_label') })}
          </ThemedText>
        </Animated.View>
      ) : null}

      <View style={styles.fields}>
        {PickupRow}
        {!saveTo ? <View style={styles.divider} /> : null}
        {DropRow}
      </View>

      {!saveTo && mode === 'pickup' ? (
        <View style={styles.gpsRow}>
          <Pressable
            onPress={useGpsForPickup}
            style={({ pressed }) => [styles.gpsBtn, pressed && styles.pressedDim]}
            android_ripple={{ color: Brand.burgundyLight, borderless: false }}
          >
            <MaterialIcons
              name={location.status === 'ready' ? 'my-location' : 'location-searching'}
              size={18}
              color={Brand.gold}
            />
            <ThemedText style={styles.gpsBtnText}>
              {location.status === 'ready'
                ? t('destination.gps_use')
                : location.status === 'denied'
                  ? t('destination.gps_allow')
                  : location.status === 'unavailable'
                    ? t('destination.gps_retry')
                    : t('destination.gps_locating')}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
      >
        {error ? (
          <Animated.View entering={FadeIn.duration(200)}>
            <ThemedText style={styles.error}>{error}</ThemedText>
          </Animated.View>
        ) : null}

        {showResults ? (
          <ThemedText type="defaultSemiBold" style={styles.section}>
            {t('destination.section_results')}
          </ThemedText>
        ) : null}

        {results.map((s, i) => {
          const isResolving = resolvingId === s.placeId;
          return (
            <Animated.View
              key={s.placeId}
              entering={FadeInDown.duration(220).delay(i * 25)}
              layout={Layout.duration(180)}
            >
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => resolveAndApply(s.placeId)}
                disabled={!!resolvingId}
                android_ripple={{ color: Brand.burgundyLight, borderless: false }}
              >
                <MaterialIcons
                  name="place"
                  size={22}
                  color={Brand.beigeMuted}
                  style={styles.rowIcon}
                />
                <View style={styles.rowText}>
                  <ThemedText numberOfLines={1}>{s.primary}</ThemedText>
                  {s.secondary ? (
                    <ThemedText style={styles.rowSub} numberOfLines={2}>
                      {s.secondary}
                    </ThemedText>
                  ) : null}
                </View>
                {isResolving ? (
                  <ActivityIndicator size="small" color={Brand.beigeMuted} />
                ) : (
                  <MaterialIcons name="north-east" size={18} color={Brand.beigeMuted} />
                )}
              </Pressable>
            </Animated.View>
          );
        })}

        {showRecents ? (
          <ThemedText type="defaultSemiBold" style={styles.section}>
            {t('destination.section_recent')}
          </ThemedText>
        ) : null}

        {showRecents
          ? filteredRecents.map((p, i) => (
              <Animated.View
                key={p.id}
                entering={FadeInDown.duration(220).delay(i * 25)}
                layout={Layout.duration(180)}
              >
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => tapRecent(p)}
                  disabled={!!resolvingId}
                  android_ripple={{ color: Brand.burgundyLight, borderless: false }}
                >
                  <MaterialIcons
                    name="history"
                    size={22}
                    color={Brand.beigeMuted}
                    style={styles.rowIcon}
                  />
                  <View style={styles.rowText}>
                    <ThemedText numberOfLines={1}>{p.name}</ThemedText>
                    {p.address ? (
                      <ThemedText style={styles.rowSub} numberOfLines={2}>
                        {p.address}
                      </ThemedText>
                    ) : null}
                  </View>
                  <MaterialIcons name="north-east" size={18} color={Brand.beigeMuted} />
                </Pressable>
              </Animated.View>
            ))
          : null}

        {!showResults && !showRecents && !error && activeQuery.length === 0 ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.empty}>
            <ThemedText style={styles.emptyText}>
              {mode === 'pickup'
                ? t('destination.empty_pickup')
                : t('destination.empty_drop')}
            </ThemedText>
          </Animated.View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

export function newSavedSlotIdForCustom() {
  return newCustomSlotId();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.burgundy,
    paddingTop: 56,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  back: {
    padding: 4,
  },
  topbarTitle: {
    fontSize: 18,
  },
  saveBanner: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    padding: 10,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.gold,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBannerText: {
    color: Brand.gold,
    fontSize: 12,
    flexShrink: 1,
  },
  fields: {
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  fieldActive: {
    // Subtle highlight for the input the rider is editing.
  },
  fieldPressed: {
    opacity: 0.75,
  },
  fieldText: {
    flex: 1,
  },
  fieldValue: {
    fontSize: 15,
    color: Brand.beige,
  },
  fieldValueSub: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 1,
  },
  fieldPlaceholder: {
    fontSize: 15,
    color: Brand.beigeMuted,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  divider: {
    height: 1,
    backgroundColor: Brand.border,
    marginVertical: 0,
    marginLeft: 22,
  },
  input: {
    flex: 1,
    color: Brand.beige,
    fontSize: 15,
    paddingVertical: 0,
  },
  gpsRow: {
    paddingHorizontal: 16,
    marginTop: -4,
    marginBottom: 8,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.gold,
    backgroundColor: Brand.burgundyLight,
    alignSelf: 'flex-start',
  },
  gpsBtnText: {
    fontSize: 13,
    color: Brand.gold,
  },
  pressedDim: {
    opacity: 0.7,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  error: {
    paddingHorizontal: 20,
    paddingTop: 14,
    color: Brand.beigeMuted,
    fontSize: 13,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    color: Brand.beigeMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  rowPressed: {
    backgroundColor: Brand.burgundyLight,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  rowSub: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 2,
  },
  empty: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  emptyText: {
    color: Brand.beigeMuted,
    fontSize: 13,
  },
});
