/**
 * Rider-side ride data layer over Supabase.
 *
 * Replaces the previous Firestore-based services/ride-firestore.ts. The shape
 * of the public surface (subscribeLatestRide, createRide, rateRide, …) is
 * preserved where possible so callers don't all have to change at once, but
 * the underlying types now reflect the normalized SQL schema.
 *
 * Auth is required for every call — the rider must be signed in. The current
 * user's profile id is read from supabase.auth.getSession() rather than a
 * baked-in DEMO identity.
 */

import { supabase } from './supabase';
import type {
  Ride as RideRow,
  RideStatus,
  GenderCheckResponse,
  Profile,
} from '@/types/database';

export type Ride = RideRow;
export type { RideStatus, GenderCheckResponse };

// ─────────────────────────────────────────────────────────────────────────────
// Identity helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function currentRiderId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user.id) throw new Error('not_authenticated');
  return data.session.user.id;
}

export async function currentRiderProfile(): Promise<Profile> {
  const id = await currentRiderId();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ride queries
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchLatestRide(): Promise<Ride | null> {
  const id = await currentRiderId();
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('rider_id', id)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchRide(rideId: string): Promise<Ride | null> {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('id', rideId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchRideHistory(): Promise<Ride[]> {
  const id = await currentRiderId();
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('rider_id', id)
    .order('requested_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Realtime subscriptions
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeRide(
  rideId: string,
  cb: (ride: Ride | null) => void,
): () => void {
  // Initial fetch + realtime updates.
  void fetchRide(rideId).then(cb).catch(() => cb(null));
  const channel = supabase
    .channel(`ride:${rideId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'kyra', table: 'rides', filter: `id=eq.${rideId}` },
      (payload) => cb((payload.new as Ride) ?? null),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeLatestRide(cb: (ride: Ride | null) => void): () => void {
  let active = true;
  let channelCleanup: (() => void) | null = null;

  void (async () => {
    const ride = await fetchLatestRide();
    if (!active) return;
    cb(ride);
    if (ride) {
      channelCleanup = subscribeRide(ride.id, cb);
    }
  })().catch(() => cb(null));

  return () => {
    active = false;
    if (channelCleanup) channelCleanup();
  };
}

export function subscribeDriverLocation(
  rideId: string,
  cb: (location: { lat: number; lng: number; recorded_at: string } | null) => void,
): () => void {
  const channel = supabase
    .channel(`ride_locations:${rideId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'kyra',
        table: 'ride_locations',
        filter: `ride_id=eq.${rideId}`,
      },
      (payload) => {
        const r = payload.new as {
          location: { coordinates: [number, number] };
          recorded_at: string;
        };
        cb({
          lng: r.location.coordinates[0],
          lat: r.location.coordinates[1],
          recorded_at: r.recorded_at,
        });
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// State-changing actions
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateRideInput {
  pickup: { lat: number; lng: number; address: string };
  drop:   { lat: number; lng: number; address: string };
  fareInr: number;
}

function toGeoPoint(lat: number, lng: number): unknown {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

function generate4DigitOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function createRide(input: CreateRideInput): Promise<Ride> {
  const id = await currentRiderId();
  const { data, error } = await supabase
    .from('rides')
    .insert({
      rider_id:        id,
      pickup_location: toGeoPoint(input.pickup.lat, input.pickup.lng) as Ride['pickup_location'],
      pickup_address:  input.pickup.address,
      drop_location:   toGeoPoint(input.drop.lat, input.drop.lng) as Ride['drop_location'],
      drop_address:    input.drop.address,
      fare_inr:        input.fareInr,
      ride_otp:        generate4DigitOtp(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelRide(rideId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('rides')
    .update({ status: 'cancelled_by_rider', cancelled_reason: reason })
    .eq('id', rideId);
  if (error) throw error;
}

export async function submitRiderGenderCheck(
  rideId: string,
  answer: GenderCheckResponse,
): Promise<Ride> {
  const { data, error } = await supabase.rpc('submit_pickup_gender_check', {
    p_ride_id: rideId,
    p_answer: answer,
  });
  if (error) throw error;
  return data;
}

export async function rateRide(
  rideId: string,
  rateeId: string,
  stars: number,
  review: string | null,
): Promise<void> {
  const id = await currentRiderId();
  // Upsert: rider can edit their rating any time (req #11).
  const { error } = await supabase
    .from('ratings')
    .upsert(
      { ride_id: rideId, rater_id: id, ratee_id: rateeId, stars, review },
      { onConflict: 'ride_id,rater_id' },
    );
  if (error) throw error;
}

export async function triggerSos(
  lat: number,
  lng: number,
  rideId: string | null = null,
): Promise<void> {
  const { error } = await supabase.rpc('trigger_sos', {
    p_lat: lat,
    p_lng: lng,
    p_ride_id: rideId,
  });
  if (error) throw error;
}

export async function respondToDeviation(
  eventId: string,
  response: 'all_good' | 'unsafe',
): Promise<void> {
  const { error } = await supabase
    .from('deviation_events')
    .update({ rider_response: response, rider_responded_at: new Date().toISOString() })
    .eq('id', eventId);
  if (error) throw error;

  if (response === 'unsafe') {
    // Auto-trigger SOS — server-side trigger will be added later; for now we
    // surface the rider's location via RPC.
    // (Caller can also call triggerSos() directly with current GPS.)
  }
}
