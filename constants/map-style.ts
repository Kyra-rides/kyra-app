/**
 * Map theming for the rider app:
 *   - DARK_MAP_STYLE: Google Maps "Dark" JSON style, applied via
 *     <MapView customMapStyle={...} provider={PROVIDER_GOOGLE} />.
 *   - TRAFFIC_COLORS: per-segment polyline color matching Google Maps
 *     navigation (blue = normal, amber = slow, red = jam).
 *   - useDarkMapReady: returns the style + an onMapReady handler that
 *     re-applies the style after the GoogleMap object has been built.
 *     Works around a long-standing Android race where customMapStyle
 *     passed on the very first render is silently dropped.
 */

import { useEffect, useState } from 'react';

export const TRAFFIC_COLORS: Record<
  'NORMAL' | 'SLOW' | 'TRAFFIC_JAM' | 'UNKNOWN',
  string
> = {
  NORMAL: '#3B82F6',      // blue — free-flowing
  SLOW: '#F59E0B',        // amber — medium congestion
  TRAFFIC_JAM: '#EF4444', // red  — heavy congestion
  UNKNOWN: '#3B82F6',     // fall back to blue when traffic data is missing
};

// Standard Google Maps "Dark" style. Plays well against burgundy chrome.
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1b' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

export function useDarkMapReady() {
  // Apply the style on a tick after mount. On Android with react-native-maps
  // 1.20+, customMapStyle passed on the very first render is sometimes
  // ignored — the GoogleMap object isn't constructed yet. Setting it via
  // a state change after mount forces the prop diff to re-call setMapStyle().
  const [style, setStyle] = useState<typeof DARK_MAP_STYLE>([]);
  useEffect(() => {
    const t = setTimeout(() => setStyle(DARK_MAP_STYLE), 200);
    return () => clearTimeout(t);
  }, []);
  const onMapReady = () => setStyle(DARK_MAP_STYLE);
  return { customMapStyle: style, onMapReady };
}
