import { Alert, StyleSheet, TextInput } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function OtpScreen() {
  // Read the phone number that was passed in from the sign-up screen.
  // `useLocalSearchParams` reads URL query params, e.g. /otp?phone=9876543210
  const { phone } = useLocalSearchParams<{ phone: string }>();

  // Local memory for the 6-digit code the user types.
  const [code, setCode] = useState('');

  const handleVerify = () => {
    // Mock verification: any 6-digit code is "correct" for now.
    // Real verification will check against the OTP sent by an SMS provider
    // (MSG91 / Twilio) once the backend is in place.
    if (code.length !== 6) {
      Alert.alert('Enter a 6-digit code', 'The code should be 6 digits long.');
      return;
    }
    // Phone is verified — move on to identity (Aadhaar) verification.
    // No alert here; the screen change itself confirms success.
    router.push('/aadhaar');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Verify your number
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        We sent a 6-digit code to {phone ? `+91 ${phone}` : 'your phone'}.
      </ThemedText>

      <TextInput
        style={styles.input}
        placeholder="123456"
        placeholderTextColor={Brand.beigeMuted}
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />

      <BrandButton title="Verify" onPress={handleVerify} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: Brand.burgundy,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: Brand.beigeMuted,
    marginBottom: 8,
  },
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
});
