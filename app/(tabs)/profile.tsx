/**
 * Rider profile tab.
 *
 * Reads live data from Supabase:
 *   - Name + phone from kyra.profiles (auth.users.id = profile_id)
 *   - "My rating" = avg(stars) where ratee_id = current user (drivers rating
 *     this rider). null when no ratings yet.
 *
 * No mock data; if the rider isn't signed in we redirect to /sign-up.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { signOut } from '@/services/auth';
import { setLanguage, type LangCode } from '@/services/i18n';
import { supabase } from '@/services/supabase';
import type { Profile } from '@/types/database';

const LANGUAGE_LABELS: Record<LangCode, string> = {
  en: 'English',
  hi: 'हिंदी',
  kn: 'ಕನ್ನಡ',
};

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [avgRating, setAvg]     = useState<number | null>(null);
  const [ratingCount, setCount] = useState<number>(0);
  const [langSheetOpen, setLangSheetOpen] = useState(false);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) {
      router.replace('/sign-up');
      return;
    }

    const [pRes, rRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('ratings').select('stars').eq('ratee_id', userId),
    ]);

    if (pRes.data) setProfile(pRes.data);

    const stars = (rRes.data ?? []).map((r) => Number(r.stars)).filter(Number.isFinite);
    if (stars.length > 0) {
      setAvg(stars.reduce((a, b) => a + b, 0) / stars.length);
      setCount(stars.length);
    } else {
      setAvg(null);
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void load();
    const sub = supabase.auth.onAuthStateChange(() => void load());
    return () => { sub.data.subscription.unsubscribe(); };
  }, [load]);

  const onSignOut = async () => {
    Alert.alert(
      t('profile.sign_out_q'),
      t('profile.sign_out_body'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.sign_out'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/sign-up');
          },
        },
      ],
    );
  };

  const onPickLang = async (code: LangCode) => {
    await setLanguage(code);
    setLangSheetOpen(false);
  };

  const currentLang = (i18n.language as LangCode) ?? 'en';

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || 'Rider'
    : 'Loading…';
  const phone = profile?.phone ?? '';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>{t('profile.title')}</ThemedText>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={32} color={Brand.burgundyDark} />
          </View>
          <View style={styles.identityText}>
            <ThemedText type="defaultSemiBold" style={styles.identityName}>
              {fullName}
            </ThemedText>
            {phone ? <ThemedText style={styles.identityPhone}>{phone}</ThemedText> : null}
          </View>
        </View>

        <View style={styles.ratingCard}>
          <MaterialIcons name="star" size={20} color={Brand.gold} />
          {avgRating !== null ? (
            <>
              <ThemedText style={styles.ratingValue}>{avgRating.toFixed(1)}</ThemedText>
              <ThemedText style={styles.ratingLabel}>
                {ratingCount === 1 ? t('profile.from_rides_one') : t('profile.from_rides', { count: ratingCount })}
              </ThemedText>
            </>
          ) : (
            <ThemedText style={styles.ratingLabel}>{t('profile.no_ratings')}</ThemedText>
          )}
        </View>

        <View style={styles.group}>
          <ListRow icon="history"             label={t('profile.my_rides')}      onPress={() => router.push('/rides')} />
          <ListRow icon="favorite-border"     label={t('profile.saved_places')}  onPress={() => router.push('/favorites')} />
          <ListRow icon="security"            label={t('profile.safety')}        onPress={() => router.push('/safety')} />
          <ListRow icon="payment"             label={t('profile.payment')}       onPress={() => router.push('/payment')} />
          <ListRow icon="notifications-none"  label={t('profile.notifications')} onPress={() => router.push('/notifications')} />
          <ListRow icon="language"            label={`${t('profile.language')} · ${LANGUAGE_LABELS[currentLang]}`} onPress={() => setLangSheetOpen(true)} />
          <ListRow icon="help-outline"        label={t('profile.help')}          onPress={() => router.push('/help')} />
          <ListRow icon="info-outline"        label={t('profile.about')}         onPress={() => router.push('/about')} />
        </View>

        <Pressable style={styles.signOutBtn} onPress={onSignOut}>
          <MaterialIcons name="logout" size={18} color="#E07B7B" />
          <ThemedText style={styles.signOutText}>{t('profile.sign_out')}</ThemedText>
        </Pressable>
      </ScrollView>

      <Modal visible={langSheetOpen} transparent animationType="slide" onRequestClose={() => setLangSheetOpen(false)}>
        <Pressable style={styles.langBackdrop} onPress={() => setLangSheetOpen(false)}>
          <View style={styles.langSheet} onStartShouldSetResponder={() => true}>
            <ThemedText type="title" style={styles.langTitle}>{t('language.title')}</ThemedText>
            {(['en','hi','kn'] as LangCode[]).map((code) => {
              const active = currentLang === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => onPickLang(code)}
                  style={[styles.langRow, active && styles.langRowActive]}
                >
                  <ThemedText style={styles.langRowText}>{LANGUAGE_LABELS[code]}</ThemedText>
                  {active && <MaterialIcons name="check" size={20} color={Brand.gold} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  content: { paddingTop: 64, paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  title:   { paddingHorizontal: 4 },
  identityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1, borderColor: Brand.border,
    borderRadius: Brand.radius,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  identityText:  { flex: 1 },
  identityName:  { fontSize: 16 },
  identityPhone: { fontSize: 13, color: Brand.beigeMuted, marginTop: 2 },
  ratingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1, borderColor: Brand.border,
    borderRadius: Brand.radius,
  },
  ratingValue: { fontWeight: '600', color: Brand.gold, fontSize: 16 },
  ratingLabel: { color: Brand.beigeMuted },
  group: {
    marginTop: 6,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1, borderColor: Brand.border,
    borderRadius: Brand.radius,
    overflow: 'hidden',
  },
  signOutBtn: {
    marginTop: 16, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: Brand.radius,
    borderWidth: 1, borderColor: '#E07B7B',
  },
  signOutText: { color: '#E07B7B', fontWeight: '600' },

  langBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  langSheet: {
    backgroundColor: Brand.burgundy,
    padding: 24, paddingBottom: 36,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    gap: 8,
    borderTopWidth: 1, borderTopColor: Brand.gold,
  },
  langTitle: { color: Brand.beige, fontSize: 20, marginBottom: 8 },
  langRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1, borderColor: Brand.border,
  },
  langRowActive: { borderColor: Brand.gold },
  langRowText:   { color: Brand.beige, fontSize: 16 },
});
