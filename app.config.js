// Dynamic Expo config — pulls the Google Maps API key from .env so app.json
// stays committable. Expo CLI auto-loads .env (EXPO_PUBLIC_* vars are exposed
// to the JS bundle; non-prefixed vars stay build-time only).

module.exports = ({ config }) => {
  const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

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
