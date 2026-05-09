/**
 * My Rides — live history of every ride this rider has booked, fetched
 * from kyra.rides + kyra.ratings.
 *
 * Each row shows date / pickup → drop / fare / status pill / current rating.
 * Tap a row to open the rate-later sheet: 5 stars, pre-filled with the
 * current rating if any. Submit upserts via services/rides.rateRide; the
 * row's rating updates instantly via the same query that loaded the list.
 *
 * No mocks — empty state ("No rides yet") if the rider hasn't booked.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import {
  currentRiderId,
  fetchRideHistory,
  rateRide,
  type Ride,
} from '@/services/rides';
import { supabase } from '@/services/supabase';

interface RideWithRating extends Ride {
  myRatingStars: number | null;
  driverName: string | null;
}

export default function RidesScreen() {
  const { t } = useTranslation();
  const [rows, setRows]     = useState<RideWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [editing, setEditing] = useState<RideWithRating | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const me     = await currentRiderId();
      const rides  = await fetchRideHistory();
      const rideIds = rides.map((r) => r.id);
      const driverIds = rides.map((r) => r.driver_id).filter((x): x is string => !!x);

      const [ratingsRes, profilesRes] = await Promise.all([
        rideIds.length
          ? supabase.from('ratings')
              .select('ride_id, stars')
              .eq('rater_id', me)
              .in('ride_id', rideIds)
          : Promise.resolve({ data: [], error: null }),
        driverIds.length
          ? supabase.from('profiles')
              .select('id, first_name, last_name')
              .in('id', driverIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const ratingByRide  = new Map((ratingsRes.data ?? []).map((r) => [r.ride_id, Number(r.stars)]));
      const driverById    = new Map((profilesRes.data ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]));

      const out: RideWithRating[] = rides.map((r) => ({
        ...r,
        myRatingStars: ratingByRide.get(r.id) ?? null,
        driverName:    r.driver_id ? (driverById.get(r.driver_id) ?? null) : null,
      }));
      setRows(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('rides_history.could_not_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={t('rides_history.title')} />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Brand.beige} />}
      >
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        {!loading && rows.length === 0 && !error && (
          <View style={styles.empty}>
            <MaterialIcons name="directions-car" size={36} color={Brand.beigeMuted} />
            <ThemedText style={styles.emptyTitle}>{t('rides_history.empty_title')}</ThemedText>
            <ThemedText style={styles.emptyHint}>{t('rides_history.empty_hint')}</ThemedText>
          </View>
        )}

        {rows.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => r.status === 'completed' && r.driver_id && setEditing(r)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowTop}>
              <ThemedText style={styles.date}>
                {formatDate(r.requested_at)}
              </ThemedText>
              <StatusPill status={r.status} />
            </View>
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: '#5BD2A2' }]} />
              <ThemedText style={styles.addr} numberOfLines={1}>{r.pickup_address}</ThemedText>
            </View>
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: Brand.gold }]} />
              <ThemedText style={styles.addr} numberOfLines={1}>{r.drop_address}</ThemedText>
            </View>
            <View style={styles.rowBottom}>
              <ThemedText style={styles.fare}>
                ₹{Number(r.fare_inr_final ?? r.fare_inr).toFixed(0)}
              </ThemedText>
              {r.driverName ? (
                <ThemedText style={styles.driver} numberOfLines={1}>
                  {t('rides_history.driver_prefix')} · {r.driverName}
                </ThemedText>
              ) : null}
              {r.status === 'completed' && r.driver_id ? (
                <View style={styles.starsRow}>
                  {r.myRatingStars ? (
                    <>
                      <MaterialIcons name="star" size={14} color={Brand.gold} />
                      <ThemedText style={styles.ratingText}>{r.myRatingStars}</ThemedText>
                    </>
                  ) : (
                    <ThemedText style={styles.rateLater}>{t('rides_history.rate')}</ThemedText>
                  )}
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {editing && (
        <RateSheet
          ride={editing}
          onClose={() => setEditing(null)}
          onSubmitted={() => { setEditing(null); void load(); }}
        />
      )}
    </ThemedView>
  );
}

function StatusPill({ status }: { status: Ride['status'] }) {
  const { t } = useTranslation();
  const map: Partial<Record<Ride['status'], { label: string; bg: string; fg: string }>> = {
    completed:                       { label: t('rides_history.status_completed'),               bg: '#1F3A2D', fg: '#5BD2A2' },
    cancelled_by_rider:              { label: t('rides_history.status_cancelled'),                bg: '#3A0E12', fg: '#E07B7B' },
    cancelled_by_driver:             { label: t('rides_history.status_cancelled_by_driver'),      bg: '#3A0E12', fg: '#E07B7B' },
    cancelled_no_driver:             { label: t('rides_history.status_no_driver'),                bg: '#3A0E12', fg: '#E07B7B' },
    cancelled_gender_check_failed:   { label: t('rides_history.status_safety'),                   bg: '#3A0E12', fg: '#E07B7B' },
  };
  const m = map[status] ?? { label: t('rides_history.status_in_progress'), bg: Brand.burgundyDark, fg: Brand.gold };
  return (
    <View style={[styles.pill, { backgroundColor: m.bg }]}>
      <ThemedText style={{ color: m.fg, fontSize: 11, letterSpacing: 0.5 }}>{m.label}</ThemedText>
    </View>
  );
}

function RateSheet({
  ride, onClose, onSubmitted,
}: {
  ride: RideWithRating;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const [stars, setStars] = useState(ride.myRatingStars ?? 0);
  const [busy, setBusy]   = useState(false);

  const onSubmit = async () => {
    if (!ride.driver_id || stars === 0) return;
    setBusy(true);
    try {
      await rateRide(ride.id, ride.driver_id, stars, null);
      onSubmitted();
    } catch (e) {
      Alert.alert(t('rides_history.could_not_submit'), e instanceof Error ? e.message : '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <ThemedText type="title" style={styles.modalTitle}>
            {ride.myRatingStars ? t('rides_history.update_title') : t('rides_history.rate_title')}
          </ThemedText>
          <ThemedText style={styles.modalSub}>
            {ride.driverName ? `${t('rides_history.driver_prefix')} · ${ride.driverName}` : ''}
          </ThemedText>
          <View style={styles.starsPicker}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={4}>
                <MaterialIcons
                  name={n <= stars ? 'star' : 'star-border'}
                  size={48}
                  color={n <= stars ? Brand.gold : Brand.beigeMuted}
                />
              </Pressable>
            ))}
          </View>
          <BrandButton
            title={busy
              ? t('rides_history.saving')
              : ride.myRatingStars
                ? t('rides_history.update')
                : t('rides_history.submit')}
            onPress={onSubmit}
            disabled={busy || stars === 0}
          />
          <Pressable onPress={onClose} hitSlop={8} style={styles.cancelBtn}>
            <ThemedText style={styles.cancelText}>{t('rides_history.close')}</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body:      { padding: 16, gap: 12 },
  error:     { color: '#E07B7B', textAlign: 'center', paddingVertical: 16 },
  empty:     { alignItems: 'center', gap: 8, padding: 32 },
  emptyTitle:{ color: Brand.beige, fontSize: 16 },
  emptyHint: { color: Brand.beigeMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  row: {
    padding: 14, gap: 6,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1, borderColor: Brand.border,
  },
  rowPressed: { opacity: 0.85 },
  rowTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date:      { color: Brand.beigeMuted, fontSize: 12, letterSpacing: 0.3 },
  routeRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  addr:      { flex: 1, color: Brand.beige, fontSize: 13 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  fare:      { color: Brand.beige, fontWeight: '600', fontSize: 14 },
  driver:    { flex: 1, color: Brand.beigeMuted, fontSize: 12 },
  starsRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText:{ color: Brand.gold, fontSize: 13, fontWeight: '600' },
  rateLater: { color: Brand.gold, fontSize: 12, textDecorationLine: 'underline' },
  pill:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Brand.burgundy,
    padding: 24, paddingBottom: 36,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    gap: 12,
    borderTopWidth: 1, borderTopColor: Brand.gold,
  },
  modalTitle:  { color: Brand.beige, fontSize: 22, textAlign: 'center' },
  modalSub:    { color: Brand.beigeMuted, fontSize: 13, textAlign: 'center' },
  starsPicker: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginVertical: 12 },
  cancelBtn:   { alignSelf: 'center', padding: 8 },
  cancelText:  { color: Brand.beigeMuted, textDecorationLine: 'underline' },
});
