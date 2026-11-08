import { supabaseAdmin } from "../config/supabase";
import { HttpError } from "../lib/errors";
import { audit } from "./audit.service";

export const CONSENT_SCOPES = ["emotional_data", "observations", "reports", "support_plans", "alerts"] as const;
export type ConsentScope = typeof CONSENT_SCOPES[number];

function dbFail(error: any): never {
  console.error("[access-db-error]", { code: error?.code, message: String(error?.message ?? "").slice(0, 180) });
  throw new HttpError(500, "No se pudo completar la operación de permisos.", "ACCESS_OPERATION_FAILED");
}

function validScope(scope: unknown): scope is ConsentScope {
  return typeof scope === "string" && (CONSENT_SCOPES as readonly string[]).includes(scope);
}

export async function listConsents(userId: string) {
  const { data, error } = await supabaseAdmin.from("relationship_consents").select("*").eq("granted_by", userId).order("created_at", { ascending: false });
  if (error) dbFail(error);
  return data ?? [];
}

export async function getActiveConsent(relationshipId: string) {
  const { data, error } = await supabaseAdmin.from("relationship_consents").select("*").eq("relationship_id", relationshipId).is("revoked_at", null).maybeSingle();
  if (error) dbFail(error);
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data;
}

export async function updateConsent(grantedBy: string, relationshipId: string, scopesInput: unknown, expiresAtInput?: unknown) {
  if (!Array.isArray(scopesInput) || scopesInput.length < 1 || scopesInput.some((scope) => !validScope(scope))) {
    throw new HttpError(400, "Los permisos seleccionados no son válidos.", "CONSENT_SCOPES_INVALID");
  }
  const { data: relationship, error: relationshipError } = await supabaseAdmin.from("relationships").select("id,joven_id,related_user_id,status").eq("id", relationshipId).maybeSingle();
  if (relationshipError) dbFail(relationshipError);
  if (!relationship || relationship.joven_id !== grantedBy || relationship.status !== "approved") {
    throw new HttpError(403, "Solo la persona titular puede modificar estos permisos.", "CONSENT_FORBIDDEN");
  }
  let expiresAt: string | null = null;
  if (expiresAtInput) {
    const parsed = new Date(String(expiresAtInput));
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) throw new HttpError(400, "La fecha de expiración no es válida.", "CONSENT_EXPIRY_INVALID");
    expiresAt = parsed.toISOString();
  }
  const { data: current, error: currentError } = await supabaseAdmin.from("relationship_consents").select("id").eq("relationship_id", relationshipId).is("revoked_at", null).maybeSingle();
  if (currentError) dbFail(currentError);
  const payload = { scopes: [...new Set(scopesInput as string[])], expires_at: expiresAt, granted_by: grantedBy };
  if (current) {
    const { data, error } = await supabaseAdmin.from("relationship_consents").update(payload).eq("id", current.id).select("*").single();
    if (error) dbFail(error);
    await audit(grantedBy, "consent.updated", "relationship_consent", data.id, { relationship_id: relationshipId, scopes: payload.scopes });
    return data;
  }
  const { data, error } = await supabaseAdmin.from("relationship_consents").insert({ relationship_id: relationshipId, ...payload }).select("*").single();
  if (error) dbFail(error);
  await audit(grantedBy, "consent.granted", "relationship_consent", data.id, { relationship_id: relationshipId, scopes: payload.scopes });
  return data;
}

export async function revokeConsent(userId: string, relationshipId: string) {
  const { data: relationship, error: relationshipError } = await supabaseAdmin.from("relationships").select("id,joven_id,status").eq("id", relationshipId).maybeSingle();
  if (relationshipError) dbFail(relationshipError);
  if (!relationship || relationship.joven_id !== userId) throw new HttpError(403, "Solo la persona titular puede revocar este permiso.", "CONSENT_FORBIDDEN");
  const { data, error } = await supabaseAdmin.from("relationship_consents").update({ revoked_at: new Date().toISOString() }).eq("relationship_id", relationshipId).is("revoked_at", null).select("*").maybeSingle();
  if (error) dbFail(error);
  if (data) await audit(userId, "consent.revoked", "relationship_consent", data.id, { relationship_id: relationshipId });
  return data;
}

export async function listTeacherAccess(userId: string) {
  const { data, error } = await supabaseAdmin.from("teacher_student_access").select("*").or(`teacher_user_id.eq.${userId},student_user_id.eq.${userId}`).order("created_at", { ascending: false });
  if (error) dbFail(error);
  return data ?? [];
}

export async function requestTeacherAccess(teacherId: string, studentId: string, institutionId: string, scopesInput: unknown) {
  if (!Array.isArray(scopesInput) || scopesInput.length < 1 || scopesInput.some((scope) => !validScope(scope))) throw new HttpError(400, "Los permisos docentes no son válidos.", "TEACHER_SCOPES_INVALID");
  if (teacherId === studentId) throw new HttpError(400, "No puedes solicitar acceso a tu propia cuenta.", "TEACHER_SELF_ACCESS");
  const { data: membership, error: membershipError } = await supabaseAdmin.from("institution_memberships").select("id,status,membership_role").eq("institution_id", institutionId).eq("user_id", teacherId).eq("status", "active").maybeSingle();
  if (membershipError) dbFail(membershipError);
  if (!membership || !["docente", "coordinador", "admin_institucion"].includes(membership.membership_role)) throw new HttpError(403, "No tienes una membresía institucional activa para solicitar este acceso.", "INSTITUTION_MEMBERSHIP_REQUIRED");
  const { data: existing, error: existingError } = await supabaseAdmin.from("teacher_student_access").select("id,status").eq("teacher_user_id", teacherId).eq("student_user_id", studentId).maybeSingle();
  if (existingError) dbFail(existingError);
  if (existing && ["pending", "approved"].includes(existing.status)) throw new HttpError(409, "Ya existe una solicitud o acceso para este estudiante.", "TEACHER_ACCESS_EXISTS");
  const { data, error } = await supabaseAdmin.from("teacher_student_access").insert({ teacher_user_id: teacherId, student_user_id: studentId, institution_id: institutionId, scopes: [...new Set(scopesInput as string[])], status: "pending", institution_approved_at: null, platform_approved_at: null }).select("*").single();
  if (error) dbFail(error);
  await audit(teacherId, "teacher_access.requested", "teacher_student_access", data.id, { student_user_id: studentId, institution_id: institutionId, scopes: data.scopes });
  return data;
}
