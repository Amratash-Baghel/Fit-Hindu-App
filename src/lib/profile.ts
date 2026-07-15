/**
 * The signed-in user's profile — small typed reads for personalisation.
 */
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { loadProgress } from "./onboarding";
import { useAuth } from "./auth";

/**
 * The user's chosen deity (onboarding Q9), or null if they skipped it.
 * `undefined` = still resolving — callers should wait rather than query with a
 * wrong value and re-sort a moment later.
 *
 * Reads the profile when signed in and falls back to the local answers when
 * not: a guest picked a deity too, and the devotional layer is never gated
 * behind an account.
 */
export function useProfileDeity(): string | null | undefined {
  const { session, loading } = useAuth();
  const [deityId, setDeityId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;
    let alive = true;

    if (!session) {
      void loadProgress().then((p) => {
        if (alive) setDeityId(p?.answers.deity_id ?? null);
      });
      return () => {
        alive = false;
      };
    }

    void supabase
      .from("profiles")
      .select("deity_id")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setDeityId(data?.deity_id ?? null);
      });
    return () => {
      alive = false;
    };
  }, [session, loading]);

  return deityId;
}
