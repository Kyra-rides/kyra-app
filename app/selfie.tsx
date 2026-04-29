import { Alert, StyleSheet, View } from 'react-native';
import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { markOnboarded } from '@/services/demo-state';

export default function SelfieScreen() {
  // Permission state. `null` = still loading; otherwise granted / denied.
  const [permission, requestPermission] = useCameraPermissions();

  // Reference to the CameraView component, so we can call methods like
  // takePictureAsync on it.
  const cameraRef = useRef<CameraView>(null);

  // Disable the Capture button while we're mid-capture (prevents double-taps).
  const [capturing, setCapturing] = useState(false);

  // Permission state still loading from the native side.
  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading camera…</ThemedText>
      </ThemedView>
    );
  }

  // User hasn't granted camera permission yet — ask for it.
  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Camera access
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          We need your camera for a one-time verification selfie. Used only to
          confirm it&apos;s really you, never shared.
        </ThemedText>
        <BrandButton title="Grant access" onPress={requestPermission} />
      </ThemedView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      // Real verification would post the photo to a face-match service
      // (AWS Rekognition / Hyperverge) along with the user's Aadhaar photo.
      // For now we just take the picture, throw it away, and show success.
      await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });
      Alert.alert(
        "You're verified ✓",
        'Welcome to Kyra. Every rider and driver here is a verified woman.',
        [
          {
            text: 'Continue',
            onPress: () => {
              markOnboarded();
              // Clear the onboarding stack and land on the home tab.
              router.dismissAll();
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } catch {
      setCapturing(false);
      Alert.alert('Could not capture', 'Please try again.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Take a selfie
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Hold your phone steady. We&apos;ll match this with your Aadhaar.
      </ThemedText>

      <View style={styles.cameraFrame}>
        <CameraView ref={cameraRef} facing="front" style={styles.camera} />
      </View>

      <BrandButton
        title={capturing ? 'Capturing…' : 'Capture'}
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
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: Brand.beigeMuted,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  cameraFrame: {
    width: 240,
    height: 240,
    borderRadius: 120, // circular frame (like Aadhaar / passport selfie UIs)
    overflow: 'hidden',
    backgroundColor: Brand.burgundyDark,
    borderWidth: 2,
    borderColor: Brand.gold,
    marginBottom: 8,
  },
  camera: {
    flex: 1,
  },
});
