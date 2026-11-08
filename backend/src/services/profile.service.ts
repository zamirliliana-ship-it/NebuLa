import { supabaseAdmin } from "../config/supabase";
import { HttpError } from "../lib/errors";
import type { z } from "zod";
import { autisticProfileSchema, guardianProfileSchema, teacherProfileSchema } from "../schemas/profile.schema";

export type PublicAccountType = "autistic_person" | "parent_guardian" | "teacher";
type ProfilePayload = z.infer<typeof autisticProfileSchema> | z.infer<typeof guardianProfileSchema> | z.infer<typeof teacherProfileSchema>;

function getSchema(accountType: unknown) {
  if (accountType === "autistic_person") return autisticProfileSchema;
  if (accountType === "parent_guardian") return guardianProfileSchema;
  if (accountType === "teacher") return teacherProfileSchema;
  throw new HttpError(403, "Tu cuenta no tiene un perfil público válido.", "PROFILE_ROLE_INVALID");
}

function shapeProfile(row: any, accountType: PublicAccountType) {
  const preferences = row?.preferences && typeof row.preferences === "object" ? row.preferences : {};
  const saved = preferences.nebula_profile && typeof preferences.nebula_profile === "object" ? preferences.nebula_profile : {};
  if (accountType === "autistic_person") return { ...saved, display_name: row?.display_name ?? saved.display_name ?? row?.full_name ?? null };
  if (accountType === "parent_guardian") return { ...saved, phone: row?.phone ?? saved.phone ?? null };
  return { ...saved, verification_status: saved.verification_status ?? "Pendiente" };
}

export async function getMyProfile(userId: string, accountType: unknown) {
  const schema = getSchema(accountType);
  void schema;
  const { data, error } = await supabaseAdmin.from("profiles")
    .select("id,full_name,display_name,phone,preferences")
    .eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "No encontramos el perfil de tu cuenta.", "PROFILE_NOT_FOUND");
  return shapeProfile(data, accountType as PublicAccountType);
}

export async function updateMyProfile(userId: string, accountType: unknown, input: unknown) {
  const schema = getSchema(accountType);
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new HttpError(400, "Los datos del perfil no son válidos.", "PROFILE_VALIDATION_FAILED");

  const { data: current, error: readError } = await supabaseAdmin.from("profiles")
    .select("id,full_name,display_name,phone,preferences")
    .eq("id", userId).single();
  if (readError) throw readError;
  const preferences = current.preferences && typeof current.preferences === "object" ? current.preferences : {};
  const existingNebula = preferences.nebula_profile && typeof preferences.nebula_profile === "object" ? preferences.nebula_profile : {};
  const fields = parsed.data as ProfilePayload;
  const nextPreferences = { ...preferences, nebula_profile: { ...existingNebula, ...fields } };
  const update: Record<string, unknown> = { preferences: nextPreferences, updated_at: new Date().toISOString() };
  if (accountType === "autistic_person" && "display_name" in fields) update.display_name = fields.display_name ?? null;
  if (accountType === "parent_guardian" && "phone" in fields) update.phone = fields.phone ?? null;

  const { data, error } = await supabaseAdmin.from("profiles").update(update)
    .eq("id", userId).select("id,full_name,display_name,phone,preferences").single();
  if (error) throw error;
  return shapeProfile(data, accountType as PublicAccountType);
}
