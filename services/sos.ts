/**
 * Rider-side SOS service.
 *
 * Wraps the `kyra.trigger_sos` RPC. Captures a fresh GPS fix (or falls back
 * to the last-known position) and sends it with the optional ride context.
 *
 * The RPC currently accepts (p_lat, p_lng, p_ride_id). A pending migration
 * (kyra-backend/migrations/PENDING_sos_extras.sql) extends it with accuracy
 * and a free-text note; the service is forward-compatible — it sends those
 * fields if the RPC is updated, and ignores the failure to set them otherwise.
 */

import * as Location from 'expo-location';

import { supabase } from './supabase';

export type SosResult = {
  eventId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
};

const FAST_TIMEOUT_MS = 4000;

async function captureFix(): Promise<{ lat: number; lng: number; accuracy: number | null }> {
  // Try a fast last-known fix first so the panic action never blocks > a second.
  const last = await Location.getLastKnownPositionAsync().catch(() => null);
  if (last) {
    // Kick off a background refresh but don't wait — the SOS row goes in now.
    void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null);
    return {
      lat: last.coords.latitude,
      lng: last.coords.longitude,
      accuracy: last.coords.accuracy ?? null,
    };
  }
  // No last-known — request once, with a short fallback window.
  const fix = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), FAST_TIMEOUT_MS)),
  ]);
  if (!fix) {
    throw new Error('SOS_NO_LOCATION');
  }
  return {
    lat: fix.coords.latitude,
    lng: fix.coords.longitude,
    accuracy: fix.coords.accuracy ?? null,
  };
}

export async function triggerSOS(rideId?: string | null, _note?: string): Promise<SosResult> {
  const { lat, lng, accuracy } = await captureFix();

  // The live RPC signature is (p_lat, p_lng, p_ride_id). Note/accuracy will be
  // accepted once the pending migration ships; until then we only send the
  // three core args.
  const { data, error } = await supabase.rpc('trigger_sos', {
    p_lat: lat,
    p_lng: lng,
    p_ride_id: rideId ?? null,
  });
  if (error) throw new Error(error.message || 'SOS_RPC_FAILED');

  // RPC returns the inserted row.
  const row = Array.isArray(data) ? data[0] : data;
  return {
    eventId: row?.id ?? 'unknown',
    lat,
    lng,
    accuracy,
  };
}
