import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { Brand } from '@/constants/theme';
import { hydratePlaces } from '@/services/places';
import '@/services/i18n';
import { getStoredLanguage } from '@/services/i18n';

// Show alerts even when app is foregrounded (driver-accepted notification etc.)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  anchor: '(tabs)',
};

const KyraNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Brand.burgundy,
    card: Brand.burgundy,
    text: Brand.beige,
    border: Brand.burgundyLight,
    primary: Brand.beige,
  },
};

export default function RootLayout() {
  const [langChecked, setLangChecked] = useState(false);
  const segments = useSegments();

  useEffect(() => {
    void hydratePlaces();
    // Request notification permissions on first launch.
    void Notifications.requestPermissionsAsync();
  }, []);

  // First-launch language gate. If the user hasn't picked a language on
  // this device yet, redirect to /language. Once chosen, persisted in
  // AsyncStorage so this only fires on the very first launch.
  useEffect(() => {
    if (langChecked) return;
    void (async () => {
      const stored = await getStoredLanguage();
      if (!stored && segments[0] !== 'language') {
        router.replace('/language');
      }
      setLangChecked(true);
    })();
  }, [langChecked, segments]);

  return (
    <ThemeProvider value={KyraNavTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Brand.burgundy },
          animation: 'slide_from_right',
          animationDuration: 220,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="language" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"   options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            title: 'Modal',
            headerShown: true,
            headerStyle: { backgroundColor: Brand.burgundy },
            headerTintColor: Brand.beige,
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
