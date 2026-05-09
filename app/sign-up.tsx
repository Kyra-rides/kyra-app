/**
 * Phone-number entry. We collect first/last name on this screen too so we have
 * everything required to mint the auth user when the OTP verifies. The flow:
 *
 *   sign-up (phone + name) → otp-send Edge Function → otp.tsx → otp-verify → selfie.tsx → home
 *
 * The OTP send call is a real network request to the Supabase Edge Function.
 * If SMS_PROVIDER=stub on the backend, the OTP shows up in `supabase functions
 * logs otp-send` rather than via real SMS — fine for dev.
 */

import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { sendOtp } from '@/services/auth';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [busy, setBusy]           = useState(false);

  const onSendOtp = async () => {
    Keyboard.dismiss();
    if (firstName.trim().length === 0 || lastName.trim().length === 0) {
      Alert.alert(t('signup.title'), t('signup.name_required'));
      return;
    }
    if (!/^[6-9][0-9]{9}$/.test(phone.trim())) {
      Alert.alert(t('signup.title'), t('signup.invalid_phone'));
      return;
    }
    setBusy(true);
    try {
      const { devOtp } = await sendOtp(`+91${phone.trim()}`, 'rider');
      router.push({
        pathname: '/otp',
        params: {
          phone: phone.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          ...(devOtp ? { dev_otp: devOtp } : {}),
        },
      });
    } catch (err) {
      Alert.alert(t('signup.could_not_send'), err instanceof Error ? err.message : t('signup.try_again'));
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
          <ScrollView
            contentContainerStyle={styles.inner}
            keyboardShouldPersistTaps="handled"
          >
            <Image
              source={require('@/assets/images/kyra-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <ThemedText type="title" style={styles.title}>{t('signup.title')}</ThemedText>
            <ThemedText style={styles.subtitle}>{t('signup.subtitle')}</ThemedText>

            <TextInput
              style={styles.input}
              placeholder={t('signup.first_name')}
              placeholderTextColor={Brand.beigeMuted}
              autoCapitalize="words"
              autoComplete="given-name"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder={t('signup.last_name')}
              placeholderTextColor={Brand.beigeMuted}
              autoCapitalize="words"
              autoComplete="family-name"
              value={lastName}
              onChangeText={setLastName}
            />
            <TextInput
              style={styles.input}
              placeholder={t('signup.phone_placeholder')}
              placeholderTextColor={Brand.beigeMuted}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, ''))}
            />

            <BrandButton title={busy ? t('signup.sending') : t('signup.send_otp')} onPress={onSendOtp} disabled={busy} />
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
    gap: 14,
  },
  logo:     { width: 180, height: 100, marginBottom: 8 },
  title:    { textAlign: 'center' },
  subtitle: { textAlign: 'center', color: Brand.beigeMuted, marginBottom: 8, paddingHorizontal: 16 },
  input: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    padding: 14,
    fontSize: 16,
    backgroundColor: Brand.burgundyLight,
    color: Brand.beige,
  },
});
