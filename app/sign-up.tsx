import { Image, StyleSheet, TextInput } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function SignUpScreen() {
  // useState gives us a piece of memory the screen can update.
  // `phone` holds whatever the user has typed so far.
  // `setPhone` is the function we call to change it.
  const [phone, setPhone] = useState('');

  return (
    <ThemedView style={styles.container}>
      <Image
        source={require('@/assets/images/kyra-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <ThemedText type="title" style={styles.title}>
        Sign up
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        Enter your phone number to get started.
      </ThemedText>

      <TextInput
        style={styles.input}
        placeholder="+91 98765 43210"
        placeholderTextColor={Brand.beigeMuted}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <BrandButton
        title="Send OTP"
        onPress={() => router.push({ pathname: '/otp', params: { phone } })}
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
    gap: 16,
    backgroundColor: Brand.burgundy,
  },
  logo: {
    width: 180,
    height: 100,
    marginBottom: 8,
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
