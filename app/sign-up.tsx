import { Button, StyleSheet, TextInput } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignUpScreen() {
  // useState gives us a piece of memory the screen can update.
  // `phone` holds whatever the user has typed so far.
  // `setPhone` is the function we call to change it.
  const [phone, setPhone] = useState('');

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Sign up
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        Enter your phone number to get started.
      </ThemedText>

      <TextInput
        style={styles.input}
        placeholder="+91 98765 43210"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <Button
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
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
});
