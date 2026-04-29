/**
 * Kyra fare model:
 *   ₹50 base — covers the first 2 km
 *   ₹20 per additional km
 *
 * Same formula applies to Auto and Bike Taxi for now; per-vehicle
 * multipliers can be layered on later if pricing diverges.
 */

export const FARE_BASE = 50;
export const FARE_BASE_KM = 2;
export const FARE_PER_KM = 20;

export function calculateFare(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return FARE_BASE;
  const extra = Math.max(0, distanceKm - FARE_BASE_KM);
  return Math.round(FARE_BASE + extra * FARE_PER_KM);
}
