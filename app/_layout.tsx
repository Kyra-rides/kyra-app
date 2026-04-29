import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { Brand } from '@/constants/theme';
import { hydratePlaces } from '@/services/places';

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
  useEffect(() => {
    void hydratePlaces();
  }, []);

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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
