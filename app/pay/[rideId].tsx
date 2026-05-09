/**
 * Post-trip payment screen.
 *
 * Renders fare + pickup / drop / driver info and offers two paths:
 *  - "Pay with UPI"     → calls services/payments.startPayment which currently
 *                         throws PAYMENT_GATEWAY_NOT_CONFIGURED. We catch it
 *                         and show a friendly "coming soon" alert that points
 *                         at the env-var hint. Once Section 5 task 6 lands,
 *                         this calls into the real Razorpay flow.
 *  - "Mark cash paid"   → uses the existing complete flow on the rides table
 *                         (sets payment_status='paid', method='cash').
 *
 * Routed in from app/ride.tsx the moment the ride flips to `completed`.
 * On success, replaces with the existing rate screen so the rider lands in
 * the same end-state she landed in before.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { startPayment } from '@/services/payments';
import { supabase } from '@/services/supabase';

type RideRow = {
  id: string;
  fare_inr: number;
  fare_inr_final: number | null;
  pickup_address: string | null;
  drop_address: string | null;
  driver_id: string | null;
};

export default function PayForRideScreen() {
  const { t } = useTranslation();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const [ride, setRide]               = useState<RideRow | null>(null);
  const [driverName, setDriverName]   = useState<string>('');
  const [driverStars, setDriverStars] = useState<number | null>(null);
  const [busy, setBusy]               = useState(false);
  const [loaded, setLoaded]           = useState(false);

  useEffect(() => {
    if (!rideId) return;
    void (async () => {
      const { data } = await supabase
        .from('rides')
        .select('id, fare_inr, fare_inr_final, pickup_address, drop_address, driver_id')
        .eq('id', rideId)
        .maybeSingle();
      setRide((data ?? null) as unknown as RideRow | null);
      setLoaded(true);

      const driverId = (data as unknown as { driver_id: string | null } | null)?.driver_id;
      if (driverId) {
        const [profileRes, ratingRes] = await Promise.all([
          supabase.from('profiles').select('first_name, last_name').eq('id', driverId).maybeSingle(),
          supabase.from('ratings').select('stars').eq('ratee_id', driverId),
        ]);
        const p = profileRes.data as unknown as { first_name?: string; last_name?: string } | null;
        if (p) setDriverName(`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim());

        const all = (ratingRes.data ?? []) as unknown as { stars: number }[];
        if (all.length) {
          const avg = all.reduce((s, r) => s + Number(r.stars), 0) / all.length;
          setDriverStars(Math.round(avg * 10) / 10);
        }
      }
    })();
  }, [rideId]);

  const fareToPay = ride?.fare_inr_final ?? ride?.fare_inr ?? 0;

  const onUpi = async () => {
    if (!ride) return;
    setBusy(true);
    try {
      await startPayment(ride.id, fareToPay);
      // Once Razorpay lands the success path falls through here. For now we
      // never reach this branch — the throw below.
      router.replace(`/rate/${ride.id}`);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'PAYMENT_GATEWAY_NOT_CONFIGURED') {
        Alert.alert(t('pay.coming_soon_title'), t('pay.coming_soon_body'));
      } else {
        Alert.alert(t('pay.could_not_complete'), code);
      }
    } finally {
      setBusy(false);
    }
  };

  const onCash = () => {
    if (!ride) return;
    // The ride is already in `completed` status by the time this screen is
    // shown (driver enters final fare → status flips → ride.tsx routes here).
    // Cash payment does not need any DB write today — the existing
    // `completed` status is the only state we track for now. When Razorpay
    // lands (Section 5.6), apply migration `PENDING_20260505_payment_columns.sql`
    // first, then write `payment_status`/`payment_method` here.
    router.replace(`/rate/${ride.id}`);
  };

  if (!loaded) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title={t('pay.title')} />
        <View style={styles.center}>
          <ActivityIndicator color={Brand.beige} />
        </View>
      </ThemedView>
    );
  }

  if (!ride) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title={t('pay.title')} />
        <View style={styles.center}>
          <ThemedText style={styles.muted}>{t('pay.ride_not_found')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={t('pay.title')} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.fareCard}>
          <ThemedText style={styles.fareLabel}>{t('pay.fare_label')}</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.fareValue}>
            ₹{Number(fareToPay).toFixed(0)}
          </ThemedText>
          <ThemedText style={styles.thanks}>{t('pay.thanks')}</ThemedText>
        </View>

        <View style={styles.metaCard}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotPickup]} />
            <View style={styles.routeText}>
              <ThemedText style={styles.routeLabel}>{t('pay.pickup_label')}</ThemedText>
              <ThemedText style={styles.routeAddr} numberOfLines={2}>{ride.pickup_address ?? '—'}</ThemedText>
            </View>
          </View>
          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotDrop]} />
            <View style={styles.routeText}>
              <ThemedText style={styles.routeLabel}>{t('pay.drop_label')}</ThemedText>
              <ThemedText style={styles.routeAddr} numberOfLines={2}>{ride.drop_address ?? '—'}</ThemedText>
            </View>
          </View>

          {driverName ? (
            <View style={styles.driverRow}>
              <MaterialIcons name="person" size={16} color={Brand.beigeMuted} />
              <ThemedText style={styles.driverText}>
                {t('pay.driver_label')} · {driverName}
                {driverStars !== null ? ` · ${driverStars} ${t('pay.rating_suffix')}` : ''}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <BrandButton
          title={busy ? t('pay.saving') : t('pay.pay_upi')}
          onPress={onUpi}
          disabled={busy}
          style={styles.cta}
        />
        <BrandButton
          title={t('pay.mark_cash')}
          onPress={onCash}
          disabled={busy}
          style={styles.cashCta}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body:      { padding: 24, gap: 14, paddingBottom: 32 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted:     { color: Brand.beigeMuted },
  fareCard: {
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Brand.gold,
  },
  fareLabel: { color: Brand.beigeMuted, fontSize: 12, letterSpacing: 1 },
  fareValue: { color: Brand.beige, fontSize: 36 },
  thanks:    { color: Brand.beigeMuted, fontSize: 12 },
  metaCard: {
    backgroundColor: Brand.burgundyDark,
    borderRadius: Brand.radius,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.burgundyLight,
  },
  routeRow:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dot:       { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  dotPickup: { backgroundColor: '#5BD2A2' },
  dotDrop:   { backgroundColor: Brand.gold },
  routeText: { flex: 1, gap: 2 },
  routeLabel:{ color: Brand.beigeMuted, fontSize: 11, letterSpacing: 0.5 },
  routeAddr: { color: Brand.beige, fontSize: 14, lineHeight: 19 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  driverText:{ color: Brand.beigeMuted, fontSize: 13 },
  cta:       { marginTop: 8, alignSelf: 'stretch' },
  cashCta:   {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Brand.border,
  },
});
