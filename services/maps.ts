/**
 * Maps service — Google Maps Platform.
 *
 *   suggest()        → Places Autocomplete (legacy)
 *   resolvePlace()   → Place Details (legacy)
 *   route()          → Routes API (computeRoutes, traffic-aware)
 *
 * Auth: API key passed via `key=` query (Places legacy) and via the
 * `X-Goog-Api-Key` header (Routes API). Key lives in app.json under
 * `expo.extra.googleMapsKey`. Native Maps SDK reads its own copies from
 * `android.config.googleMaps.apiKey` and `ios.config.googleMapsApiKey`.
 *
 * Enable in GCP: Places API, Routes API, Maps SDK for Android/iOS.
 */

import Constants from 'expo-constants';

export type Coord = { lat: number; lng: number };

export type Suggestion = {
  placeId: string;
  primary: string;
  secondary: string;
};

export type Place = {
  id: string;
  name: string;
  address: string;
  coord: Coord;
};

export type SpeedCategory = 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM' | 'UNKNOWN';

export type RouteSegment = {
  coords: Coord[];
  speed: SpeedCategory;
};

export type Route = {
  coords: Coord[];
  segments: RouteSegment[];
  distanceKm: number;
  durationMin: number;
};

const KEY: string =
  (Constants.expoConfig?.extra?.googleMapsKey as string | undefined) ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ??
  '';

function ensureKey() {
  if (!KEY) throw new Error('Google Maps key missing in app.json extra.googleMapsKey');
}

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// Bias to Bengaluru — Kyra is BLR-only at launch.
const BLR_CENTER = '12.9716,77.5946';
const BLR_RADIUS_M = 30000;

export async function suggest(query: string): Promise<Suggestion[]> {
  ensureKey();
  const q = query.trim();
  if (q.length < 2) return [];

  const url =
    `${PLACES_BASE}/autocomplete/json` +
    `?input=${encodeURIComponent(q)}` +
    `&location=${BLR_CENTER}&radius=${BLR_RADIUS_M}&strictbounds=true` +
    `&components=country:in&language=en&key=${KEY}`;

  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    predictions?: Array<{
      place_id: string;
      structured_formatting?: { main_text?: string; secondary_text?: string };
      description: string;
    }>;
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || data.status);
  }

  return (data.predictions ?? []).map((p) => ({
    placeId: p.place_id,
    primary: p.structured_formatting?.main_text ?? p.description,
    secondary: p.structured_formatting?.secondary_text ?? '',
  }));
}

export async function resolvePlace(placeId: string): Promise<Place> {
  ensureKey();
  const url =
    `${PLACES_BASE}/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=name,formatted_address,geometry/location` +
    `&key=${KEY}`;

  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    result?: {
      name?: string;
      formatted_address?: string;
      geometry?: { location: { lat: number; lng: number } };
    };
  };

  if (data.status !== 'OK' || !data.result?.geometry) {
    throw new Error(data.error_message || data.status);
  }

  const r = data.result;
  return {
    id: placeId,
    name: r.name ?? r.formatted_address ?? 'Unnamed',
    address: r.formatted_address ?? '',
    coord: { lat: r.geometry!.location.lat, lng: r.geometry!.location.lng },
  };
}

export async function route(from: Coord, to: Coord): Promise<Route> {
  ensureKey();

  const body = {
    origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
    destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
    travelMode: 'DRIVE',
    // TRAFFIC_AWARE_OPTIMAL is required for the TRAFFIC_ON_POLYLINE extra computation.
    routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    extraComputations: ['TRAFFIC_ON_POLYLINE'],
    polylineEncoding: 'ENCODED_POLYLINE',
    polylineQuality: 'HIGH_QUALITY',
    regionCode: 'IN',
    languageCode: 'en-IN',
    units: 'METRIC',
  };

  const res = await fetch(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      // Routes API requires an explicit field mask — only billed for what we ask for.
      'X-Goog-FieldMask': [
        'routes.distanceMeters',
        'routes.duration',
        'routes.polyline.encodedPolyline',
        'routes.travelAdvisory.speedReadingIntervals',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    error?: { message?: string; status?: string };
    routes?: Array<{
      distanceMeters?: number;
      duration?: string;
      polyline?: { encodedPolyline?: string };
      travelAdvisory?: {
        speedReadingIntervals?: Array<{
          startPolylinePointIndex?: number;
          endPolylinePointIndex?: number;
          speed?: SpeedCategory;
        }>;
      };
    }>;
  };

  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Routes API ${res.status}`);
  }
  const r = data.routes?.[0];
  if (!r || !r.polyline?.encodedPolyline || r.distanceMeters == null) {
    throw new Error('No route found');
  }

  // duration is a protobuf Duration string like "742s"
  const seconds = r.duration ? parseInt(r.duration.replace(/[^0-9]/g, ''), 10) || 0 : 0;
  const coords = decodePolyline(r.polyline.encodedPolyline);
  const segments = buildTrafficSegments(coords, r.travelAdvisory?.speedReadingIntervals ?? []);

  return {
    distanceKm: r.distanceMeters / 1000,
    durationMin: Math.max(1, Math.round(seconds / 60)),
    coords,
    segments,
  };
}

/**
 * Slice the full polyline into per-traffic-state segments.
 * Each `speedReadingIntervals` entry covers polyline indices
 * [startPolylinePointIndex, endPolylinePointIndex]. We include the end
 * index in the slice and overlap one point with the next segment so the
 * rendered Polylines visually connect with no gap.
 */
function buildTrafficSegments(
  coords: Coord[],
  intervals: Array<{
    startPolylinePointIndex?: number;
    endPolylinePointIndex?: number;
    speed?: SpeedCategory;
  }>,
): RouteSegment[] {
  if (coords.length === 0) return [];
  if (intervals.length === 0) {
    return [{ coords, speed: 'UNKNOWN' }];
  }
  return intervals
    .map((iv) => {
      const start = iv.startPolylinePointIndex ?? 0;
      const end = iv.endPolylinePointIndex ?? coords.length - 1;
      return {
        coords: coords.slice(start, end + 1),
        speed: iv.speed ?? 'UNKNOWN',
      };
    })
    .filter((s) => s.coords.length >= 2);
}

// Decode Google's encoded polyline format.
// https://developers.google.com/maps/documentation/utilities/polylinealgorithm
function decodePolyline(encoded: string): Coord[] {
  const out: Coord[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;

    out.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return out;
}

