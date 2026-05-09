/**
 * Kyra fare model — per vehicle:
 *   Auto: ₹50 base + ₹20 per km
 *   Bike: ₹40 base + ₹15 per km
 *
 * Both pricings apply to the full distance (no included km) so a 5 km auto
 * costs 50 + 5*20 = ₹150, a 5 km bike costs 40 + 5*15 = ₹115.
 */

export type FareVehicle = 'auto' | 'bike';

export const FARE_RATES: Record<FareVehicle, { base: number; perKm: number }> = {
  auto: { base: 50, perKm: 20 },
  bike: { base: 40, perKm: 15 },
};

export function calculateFare(distanceKm: number, vehicle: FareVehicle = 'auto'): number {
  const rate = FARE_RATES[vehicle];
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return rate.base;
  return Math.round(rate.base + distanceKm * rate.perKm);
}
