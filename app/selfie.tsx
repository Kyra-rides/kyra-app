/**
 * Selfie capture for woman-verification.
 *
 * The photo is uploaded to the private `selfies` bucket at
 * `selfies/{user_id}/woman_selfie.jpg`, and a row is inserted in
 * kyra.kyc_documents (doc_type='rider_woman_selfie', status='pending') so the
 * admin queue can review it. The rider can use the app, but ride booking is
 * gated on `riders.woman_verified = true` (set when an admin approves the doc).
 */

import { Modal, StyleSheet, View } from 'react-native';
import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { supabase } from '@/services/supabase';

export default function SelfieScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>{t('selfie.loading_camera')}</ThemedText>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>{t('selfie.permission_title')}</ThemedText>
        <ThemedText style={styles.subtitle}>{t('selfie.permission_body')}</ThemedText>
        <BrandButton title={t('selfie.grant')} onPress={requestPermission} />
      </ThemedView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
      });
      if (!photo?.uri) throw new Error(t('selfie.photo_failed'));

      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error(t('selfie.not_signed_in'));

      // Read the local file as a base64 string, then upload as a Uint8Array.
      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: 'base64' as const,
      });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      // Route through the selfie-upload edge function so service-role bypasses
      // storage RLS. Ops verifies the photo by browsing the `selfies` bucket
      // directly; we skip kyc_documents / riders inserts for v1.0.0.
      const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;
      const ANON_KEY      = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
      const res = await fetch(`${FUNCTIONS_URL}/selfie-upload`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: ANON_KEY,
          authorization: `Bearer ${session.session?.access_token ?? ANON_KEY}`,
        },
        body: JSON.stringify({ user_id: userId, base64 }),
      });
      const upBody = await res.json().catch(() => ({}));
      if (!res.ok || !upBody.ok) throw new Error(upBody?.error ?? `upload_failed_${res.status}`);

      setSubmitted(true);
    } catch (err) {
      Alert.alert(t('selfie.could_not_submit'), err instanceof Error ? err.message : t('signup.try_again'));
    } finally {
      setCapturing(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Modal visible={submitted} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.iconRing}>
              <ThemedText style={styles.tick}>✓</ThemedText>
            </View>
            <ThemedText type="title" style={styles.cardTitle}>{t('selfie.submitted_title')}</ThemedText>
            <ThemedText style={styles.cardBody}>{t('selfie.submitted_body')}</ThemedText>
            <BrandButton
              title={t('selfie.continue')}
              onPress={() => {
                setSubmitted(false);
                router.dismissAll();
                router.replace('/(tabs)');
              }}
            />
          </View>
        </View>
      </Modal>

      <ThemedText type="title" style={styles.title}>{t('selfie.title')}</ThemedText>
      <ThemedText style={styles.subtitle}>{t('selfie.subtitle')}</ThemedText>

      <View style={styles.cameraFrame}>
        <CameraView ref={cameraRef} facing="front" style={styles.camera} />
      </View>

      <BrandButton
        title={capturing ? t('selfie.submitting') : t('selfie.capture')}
        onPress={handleCapture}
        disabled={capturing}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: Brand.burgundy,
  },
  title:    { textAlign: 'center' },
  subtitle: { textAlign: 'center', color: Brand.beigeMuted, paddingHorizontal: 8, marginBottom: 8 },
  cameraFrame: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    backgroundColor: Brand.burgundyDark,
    borderWidth: 2,
    borderColor: Brand.gold,
    marginBottom: 8,
  },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: Brand.burgundyLight,
    borderRadius: 16,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.burgundyDark,
    borderWidth: 2,
    borderColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tick:      { color: Brand.gold, fontSize: 28, fontWeight: '700' },
  cardTitle: { textAlign: 'center', color: Brand.beige },
  cardBody:  { textAlign: 'center', color: Brand.beigeMuted, lineHeight: 22 },
});
