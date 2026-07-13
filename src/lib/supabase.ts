/**
 * Supabase client. Keys come from EXPO_PUBLIC_* env vars (see .env.example);
 * the anon key is safe to ship — RLS is the security boundary (see
 * docs/specs/data-model.md).
 */
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly in dev — a missing env file otherwise surfaces as cryptic fetch errors.
  console.warn(
    "[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY missing — copy .env.example to .env and fill in your project values.",
  );
}

export const supabase = createClient(url ?? "http://localhost:54321", anonKey ?? "anon", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
