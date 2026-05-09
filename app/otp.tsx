/**
 * OTP entry. Calls the Supabase otp-verify Edge Function which returns a
 * session; we set it on the client and route to /selfie for the woman-
 * verification photo. Aadhaar entry was removed — riders no longer submit
 * an Aadhaar number, only a selfie that admins approve manually.
 */

import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { verifyOtp } from '@/services/auth';

export default function OtpScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    phone?: string;
    first_name?: string;
    last_name?: string;
    dev_otp?: string;
  }>();

  const [code, setCode] = useState(params.dev_otp ?? '');
  const [busy, setBusy] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert(t('otp.title'), t('otp.instruction', { phone: params.phone ?? '' }));
      return;
    }
    if (!params.phone || !params.first_name || !params.last_name) {
      Alert.alert(t('otp.missing'), t('otp.go_back'));
      return;
    }
    setBusy(true);
    try {
      await verifyOtp({
        phone:     `+91${params.phone}`,
        otp:       code,
        role:      'rider',
        firstName: params.first_name,
        lastName:  params.last_name,
      });
      Keyboard.dismiss();
      router.replace('/selfie');
    } catch (err) {
      Alert.alert(t('otp.fail'), err instanceof Error ? err.message : t('signup.try_again'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ThemedView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
            <ThemedText type="title" style={styles.title}>{t('otp.title')}</ThemedText>
            <ThemedText style={styles.subtitle}>
              {t('otp.instruction', { phone: params.phone ? `+91 ${params.phone}` : '' })}
            </ThemedText>
            {params.dev_otp ? (
              <ThemedView style={styles.devBanner}>
                <ThemedText style={styles.devBannerText}>
                  {t('otp.dev_hint', { otp: params.dev_otp })}
                </ThemedText>
              </ThemedView>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="123456"
              placeholderTextColor={Brand.beigeMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ''))}
              autoFocus
            />

            <BrandButton
              title={busy ? t('otp.verifying') : t('otp.verify')}
              onPress={handleVerify}
              disabled={busy}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  flex:      { flex: 1 },
  inner: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title:    { textAlign: 'center' },
  subtitle: { textAlign: 'center', color: Brand.beigeMuted, marginBottom: 8, paddingHorizontal: 16 },
  input: {
    width: '60%',
    maxWidth: 240,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    padding: 14,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    backgroundColor: Brand.burgundyLight,
    color: Brand.beige,
  },
  devBanner: {
    backgroundColor: Brand.beige,
    borderRadius: Brand.radius,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 8,
  },
  devBannerText: {
    color: Brand.burgundy,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
