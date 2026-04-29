/**
 * Tiny shared trip store — holds pickup/drop/route across screens
 * without pushing huge objects through router params. Plain
 * useSyncExternalStore so we don't pull in zustand for one slice.
 */

import { useSyncExternalStore } from 'react';

import type { Place, Route } from './maps';

type TripState = {
  pickup: Place | null;
  drop: Place | null;
  route: Route | null;
};

let state: TripState = { pickup: null, drop: null, route: null };
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

export function setPickup(p: Place | null) {
  state = { ...state, pickup: p };
  emit();
}

export function setDrop(p: Place | null) {
  state = { ...state, drop: p };
  emit();
}

export function setRoute(r: Route | null) {
  state = { ...state, route: r };
  emit();
}

export function resetTrip() {
  state = { pickup: null, drop: null, route: null };
  emit();
}

export function useTrip(): TripState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
