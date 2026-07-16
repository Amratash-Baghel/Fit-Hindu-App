/**
 * Diet queries + the AI custom-plan pipeline (owner override 2026-07-16).
 *
 * Flow: the app inserts a diet_plan_requests row (status 'pending'), mirrors
 * ht/wt/region onto the profile, then POSTs {request_id, answers} to an n8n
 * webhook. n8n runs the AI and writes plan+status back with the service-role
 * key. The app polls the row (getDietRequest) until status is ready/failed.
 *
 * Like the rest of the app, the user-owned writes require auth (RLS); until
 * app auth ships, submit returns { ok:false, reason:'auth' } and the UI shows
 * the "activates with sign-in" note.
 */
import { supabase } from "./supabase";
import type { DietPlanRequest, DietTemplate } from "../types/db";

const N8N_WEBHOOK_URL = process.env.EXPO_PUBLIC_N8N_DIET_WEBHOOK_URL ?? "";
const N8N_SHARED_SECRET = process.env.EXPO_PUBLIC_N8N_DIET_SECRET ?? "";

export interface DietQuestionnaireAnswers {
  height_cm: number | null;
  weight_kg: number | null;
  region: string | null;
  goal: string | null;
  diet_type: string | null;
  activity_level: string | null;
}

/** Published admin-authored diet templates (rule-based; shown alongside the AI CTA). */
export async function listDietTemplates(): Promise<DietTemplate[]> {
  const { data, error } = await supabase
    .from("diet_templates")
    .select("id, name_hi, name_en, diet_types, total_kcal, status, created_at")
    .eq("status", "published")
    .order("name_en");
  if (error) throw error;
  return (data ?? []) as DietTemplate[];
}

export type SubmitResult = { ok: true; id: string } | { ok: false; reason: "auth" | "error"; message?: string };

export async function submitDietRequest(answers: DietQuestionnaireAnswers): Promise<SubmitResult> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: req, error } = await supabase
      .from("diet_plan_requests")
      .insert({ user_id: user.id, answers, status: "pending" })
      .select("id")
      .single();
    if (error) return { ok: false, reason: "error", message: error.message };

    // Mirror the reusable identity fields onto the profile (best-effort).
    await supabase
      .from("profiles")
      .update({
        height_cm: answers.height_cm,
        weight_kg: answers.weight_kg,
        region: answers.region,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // Kick the n8n workflow. Best-effort: if it fails, the row stays 'pending'
    // and the plan screen surfaces the wait/retry state.
    if (N8N_WEBHOOK_URL) {
      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(N8N_SHARED_SECRET ? { "x-fithindu-secret": N8N_SHARED_SECRET } : {}),
          },
          body: JSON.stringify({ request_id: req.id, answers }),
        });
      } catch {
        // ignore — polling will still reflect the eventual status
      }
    }

    return { ok: true, id: req.id };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : undefined };
  }
}

export async function getDietRequest(id: string): Promise<DietPlanRequest | null> {
  const { data, error } = await supabase
    .from("diet_plan_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as DietPlanRequest) ?? null;
}

/** The user's most recent request (any status), or null when signed out / none. */
export async function getLatestDietRequest(): Promise<DietPlanRequest | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("diet_plan_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as DietPlanRequest) ?? null;
}
