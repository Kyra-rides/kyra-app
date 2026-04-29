/**
 * Current-location store. One shared GPS state across screens — first
 * caller triggers permission request and reverse-geocode; subsequent
 * subscribers see the cached result. `refresh()` re-fetches on demand
 * (e.g. when the user taps the recenter FAB).
 *
 * status:
 *   'idle'        — never fetched
 *   'loading'     — permission requested or position in flight
 *   'ready'       — `place` is set
 *   'denied'      — user denied permission; rider must enter pickup manually
 *   'unavailable' — services off / timed out / GPS error
 */

import * as Location from 'expo-location';
import { useEffect, useSyncExternalStore } from 'react';

import type { Place } from './maps';

export type LocationStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'unavailable';

type State = {
  place: Place | null;
  status: LocationStatus;
};

let state: State = { place: null, status: 'idle' };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

let inflight: Promise<void> | null = null;

export function getLocationState(): State {
  return state;
}

export async function refreshCurrentLocation(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    state = { ...state, status: 'loading' };
    emit();
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        state = { place: null, status: 'denied' };
        emit();
        return;
      }
      const services = await Location.hasServicesEnabledAsync();
      if (!services) {
        state = { place: null, status: 'unavailable' };
        emit();
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      let name = 'Current location';
      let address = '';
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        const r = reverse[0];
        if (r) {
          name = r.name || r.street || r.district || r.city || 'Current location';
          address = [r.street, r.district, r.city, r.region]
            .filter((s): s is string => !!s && s !== name)
            .join(', ');
        }
      } catch {
        // Reverse geocode is best-effort — we still have a valid coord.
      }

      state = {
        place: {
          id: 'current-gps',
          name,
          address,
          coord: { lat, lng },
        },
        status: 'ready',
      };
      emit();
    } catch {
      state = { place: null, status: 'unavailable' };
      emit();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useCurrentLocation(): State {
  const snap = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => {
    if (state.status === 'idle') {
      void refreshCurrentLocation();
    }
  }, []);
  return snap;
}
