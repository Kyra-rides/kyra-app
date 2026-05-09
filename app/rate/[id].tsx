/**
 * Rider post-trip rating screen.
 *
 * Loads the completed ride, shows 5 stars + Submit / Do it later. Pre-fills
 * any existing rating so the rider can edit it. Submit upserts via
 * services/rides.rateRide; Do it later returns home without writing.
 *
 * The completion screen also reminds the rider what to pay (cash / UPI),
 * since payment is offline (no in-app payments yet).
 */

import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { currentRiderId, rateRide } from '@/services/rides';
import { supabase } from '@/services/supabase';
import type { Ride } from '@/types/database';

export default function RateDriverScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stars, setStars]     = useState<number>(0);
  const [ride, setRide]       = useState<Ride | null>(null);
  const defaultDriver = t('rate.default_driver');
  const [driverName, setName] = useState<string>(defaultDriver);
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const me = await currentRiderId();

      const { data: r } = await supabase
        .from('rides')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!r) return;
      setRide(r as Ride);

      if (r.driver_id) {
        const [profileRes, existingRes] = await Promise.all([
          supabase.from('profiles').select('first_name, last_name').eq('id', r.driver_id).maybeSingle(),
          supabase.from('ratings').select('stars').eq('ride_id', id).eq('rater_id', me).maybeSingle(),
        ]);
        if (profileRes.data) {
          setName(`${profileRes.data.first_name} ${profileRes.data.last_name}`.trim() || defaultDriver);
        }
        if (existingRes.data?.stars) {
          setStars(existingRes.data.stars);
        }
      }
    })();
  }, [id, defaultDriver]);

  const onSubmit = async () => {
    if (!id || !ride?.driver_id || stars === 0) return;
    setBusy(true);
    try {
      await rateRide(id, ride.driver_id, stars, null);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert(t('rate.could_not_submit'), err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  const onLater = () => router.replace('/(tabs)');

  const fareDue = ride?.fare_inr_final ?? ride?.fare_inr ?? 0;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.body}>
        <MaterialIcons name="check-circle" size={56} color="#5BD2A2" />
        <ThemedText type="title" style={styles.title}>{t('rate.trip_complete')}</ThemedText>

        <View style={styles.payCard}>
          <ThemedText style={styles.payLabel}>{t('rate.pay_label')}</ThemedText>
          <ThemedText style={styles.payAmount}>₹{Number(fareDue).toFixed(0)}</ThemedText>
          <ThemedText style={styles.payHint}>{t('rate.pay_hint', { name: driverName })}</ThemedText>
        </View>

        <ThemedText style={styles.muted}>{t('rate.how_was')}</ThemedText>
        <Stars value={stars} onChange={setStars} />

        <BrandButton
          title={busy ? t('rate.submitting') : t('rate.submit')}
          onPress={onSubmit}
          disabled={busy || stars === 0}
        />

        <Pressable onPress={onLater} hitSlop={8} style={styles.laterBtn}>
          <ThemedText style={styles.laterText}>{t('rate.do_later')}</ThemedText>
        </Pressable>

        <ThemedText style={styles.dim}>
          {t('rate.history_hint')}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={4}>
          <MaterialIcons
            name={n <= value ? 'star' : 'star-border'}
            size={48}
            color={n <= value ? Brand.gold : Brand.beigeMuted}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  title: { textAlign: 'center', fontSize: 26 },
  muted: { color: Brand.beige, textAlign: 'center', fontSize: 16 },
  dim:   { color: Brand.beigeMuted, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  payCard: {
    width: '100%',
    padding: 18,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.gold,
    alignItems: 'center',
    gap: 4,
  },
  payLabel:  { color: Brand.gold, fontSize: 11, letterSpacing: 1.5 },
  payAmount: { color: Brand.beige, fontSize: 36, fontWeight: '700' },
  payHint:   { color: Brand.beigeMuted, fontSize: 12 },
  stars:     { flexDirection: 'row', gap: 4, marginVertical: 12 },
  laterBtn:  { paddingVertical: 8 },
  laterText: { color: Brand.beigeMuted, textDecorationLine: 'underline' },
});
