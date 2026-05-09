/**
 * i18n setup for the rider app.
 *
 * Loads English / Hindi / Kannada strings, persists the selection in
 * AsyncStorage so it survives reloads, and writes through to
 * kyra.profiles.language_pref the moment the user is authenticated.
 *
 * `getStoredLanguage()` is used by `_layout.tsx` to decide whether to gate
 * first-launch onto the /language picker. Returns null on first ever launch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { type LanguageDetectorAsyncModule } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import kn from '@/locales/kn.json';

import { supabase } from './supabase';

export type LangCode = 'en' | 'hi' | 'kn';
export const SUPPORTED: LangCode[] = ['en', 'hi', 'kn'];

const STORAGE_KEY = 'kyra:lang';

const detector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: async (cb) => {
    try {
      const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as LangCode | null;
      cb(saved && SUPPORTED.includes(saved) ? saved : 'en');
    } catch {
      cb('en');
    }
  },
  cacheUserLanguage: async (lng) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, lng); } catch { /* silent */ }
  },
};

void i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      kn: { translation: kn },
    },
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false }, // RN doesn't have HTML to escape
    returnNull: false,
  });

/** Has the user picked a language at least once on this device? */
export async function getStoredLanguage(): Promise<LangCode | null> {
  try {
    const v = (await AsyncStorage.getItem(STORAGE_KEY)) as LangCode | null;
    return v && SUPPORTED.includes(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Switch the active language. Persists locally AND, if the user is signed in,
 * writes to kyra.profiles.language_pref so it follows them across devices.
 */
export async function setLanguage(lng: LangCode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (userId) {
    await supabase.from('profiles').update({ language_pref: lng }).eq('id', userId);
  }
}

export { i18n };
