// Dynamic Expo config — pulls secrets from process.env so app.json stays
// committable. Expo CLI auto-loads .env (EXPO_PUBLIC_* vars are exposed
// to the JS bundle; non-prefixed vars stay build-time only).

module.exports = ({ config }) => {
  const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

  if (!googleMapsKey) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_MAPS_KEY is not set. Add it to .env (see .env.example).',
    );
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...(config.ios?.config ?? {}),
        googleMapsApiKey: googleMapsKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...(config.android?.config ?? {}),
        googleMaps: { apiKey: googleMapsKey },
      },
    },
    extra: {
      ...(config.extra ?? {}),
      googleMapsKey,
    },
  };
};
