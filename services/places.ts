/**
 * Saved + recent places store.
 *
 *   useRecents()   → up-to-most-recent-8 places the rider actually picked
 *   useSaved()     → home / work / custom-named saved addresses
 *   addRecent(p)   → push to front, dedupe, cap at 8
 *   setSaved(slot) → upsert; slot is 'home' | 'work' | string ('saved-<id>')
 *   removeSaved()  → drop a slot entirely
 *
 * Persisted to AsyncStorage so picks survive cold launches. Falls back to
 * in-memory only if AsyncStorage isn't installed (lets the module compile
 * before the dep lands).
 */

import { useSyncExternalStore } from 'react';

import type { Place } from './maps';

export type SavedSlot = {
  id: string;            // 'home' | 'work' | 'saved-<timestamp>'
  label: string;         // 'Home' | 'Work' | user-supplied
  icon: 'home' | 'work-outline' | 'star-outline';
  place: Place;
};

type State = {
  recents: Place[];
  saved: SavedSlot[];
  hydrated: boolean;
};

const RECENTS_KEY = 'kyra:recents:v1';
const SAVED_KEY = 'kyra:saved:v1';
const RECENTS_MAX = 8;

let state: State = { recents: [], saved: [], hydrated: false };
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

// Lazy AsyncStorage so the module loads even if the dep is missing.
type AsyncStorageLike = {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
};
let storage: AsyncStorageLike | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  storage = require('@react-native-async-storage/async-storage').default as AsyncStorageLike;
} catch {
  storage = null;
}

async function persist() {
  if (!storage) return;
  try {
    await Promise.all([
      storage.setItem(RECENTS_KEY, JSON.stringify(state.recents)),
      storage.setItem(SAVED_KEY, JSON.stringify(state.saved)),
    ]);
  } catch {
    // Persistence is best-effort; UI already reflects the change.
  }
}

export async function hydratePlaces() {
  if (state.hydrated) return;
  if (!storage) {
    state = { ...state, hydrated: true };
    emit();
    return;
  }
  try {
    const [r, s] = await Promise.all([
      storage.getItem(RECENTS_KEY),
      storage.getItem(SAVED_KEY),
    ]);
    state = {
      recents: r ? (JSON.parse(r) as Place[]) : [],
      saved: s ? (JSON.parse(s) as SavedSlot[]) : [],
      hydrated: true,
    };
  } catch {
    state = { ...state, hydrated: true };
  }
  emit();
}

export function addRecent(place: Place) {
  const without = state.recents.filter((p) => p.id !== place.id);
  state = { ...state, recents: [place, ...without].slice(0, RECENTS_MAX) };
  emit();
  void persist();
}

export function clearRecents() {
  state = { ...state, recents: [] };
  emit();
  void persist();
}

export function setSaved(slot: SavedSlot) {
  const without = state.saved.filter((s) => s.id !== slot.id);
  state = { ...state, saved: [...without, slot] };
  emit();
  void persist();
}

export function removeSaved(id: string) {
  state = { ...state, saved: state.saved.filter((s) => s.id !== id) };
  emit();
  void persist();
}

export function findSaved(id: string): SavedSlot | undefined {
  return state.saved.find((s) => s.id === id);
}

export function useRecents(): Place[] {
  return useSyncExternalStore(subscribe, () => state.recents, () => state.recents);
}

export function useSaved(): SavedSlot[] {
  return useSyncExternalStore(subscribe, () => state.saved, () => state.saved);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => state.hydrated, () => state.hydrated);
}

// Built-in slot ids. Custom slots use `saved-<timestamp>`.
export const HOME_SLOT = 'home';
export const WORK_SLOT = 'work';

export function newCustomSlotId(): string {
  return `saved-${Date.now()}`;
}
