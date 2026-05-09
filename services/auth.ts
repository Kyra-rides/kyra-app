/**
 * Auth wrappers for the rider app. Calls the Supabase Edge Functions
 * `otp-send` and `otp-verify` directly (not via supabase-js) because OTP-based
 * sign-up isn't covered by the standard auth client flows.
 *
 * `verifyOtp` returns a session — the supabase client picks it up automatically
 * via setSession(), so subsequent queries are authenticated.
 */

import { supabase } from './supabase';

const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY      = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface SendOtpResult {
  ttlSeconds: number;
  provider: 'stub' | 'msg91';
  /** Only present when SMS_PROVIDER=stub on the backend. Surfaces the OTP for dev. */
  devOtp?: string;
}

export async function sendOtp(phone: string, role: 'rider' | 'driver'): Promise<SendOtpResult> {
  const res = await fetch(`${FUNCTIONS_URL}/otp-send`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: ANON_KEY,
      authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ phone, role }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? `OTP send failed (${res.status})`);
  }
  return {
    ttlSeconds: body.ttl_seconds,
    provider:   body.provider,
    devOtp:     body.dev_otp,
  };
}

export interface VerifyOtpInput {
  phone: string;
  otp: string;
  role: 'rider' | 'driver';
  firstName: string;
  lastName: string;
  languagePref?: 'en' | 'hi' | 'kn';
}

export async function verifyOtp(input: VerifyOtpInput): Promise<void> {
  const res = await fetch(`${FUNCTIONS_URL}/otp-verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: ANON_KEY,
      authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      phone:         input.phone,
      otp:           input.otp,
      role:          input.role,
      first_name:    input.firstName,
      last_name:     input.lastName,
      language_pref: input.languagePref ?? 'en',
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(body?.error ?? `OTP verification failed (${res.status})`);
  }

  const { error } = await supabase.auth.setSession({
    access_token:  body.access_token,
    refresh_token: body.refresh_token,
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
