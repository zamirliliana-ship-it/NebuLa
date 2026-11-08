import { createHash, randomInt } from "node:crypto";
import { supabaseAdmin } from "../config/supabase";
import { HttpError } from "../lib/errors";
import { audit } from "./audit.service";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_TTL_MINUTES = 15;
const relationshipLabels = new Set(["parent", "mother", "father", "legal_guardian", "caregiver"]);
const consentScopes = ["emotional_data", "observations", "reports", "support_plans", "alerts"];
function hashCode(code: string) { return createHash("sha256").update(code).digest("hex"); }
function makeCode() { return Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(""); }
function fail(error: unknown): never {
  const e = error as { code?: string; message?: string };
  console.error("[relationship-db-error]", { code: e?.code ?? "UNKNOWN", message: e?.message?.slice(0, 180) ?? "unknown" });
  throw new HttpError(500, "No se pudo completar la operación de vinculación. Revisa los registros del servidor.", "RELATIONSHIP_OPERATION_FAILED");
}
function shape(row: any) {
  return { id: row.id, subject_user_id: row.joven_id, related_user_id: row.related_user_id,
    relationship_type: row.relationship_label ?? (row.relationship_type === "tutor" ? "parent" : row.relationship_type),
    authority_basis: row.authority_basis ?? "subject_consent",
    status: row.status === "approved" ? "active" : row.status,
    created_at: row.created_at, updated_at: row.updated_at };
}

export async function createInvite(subjectUserId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = makeCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();
    const { error } = await supabaseAdmin.from("relationship_invites").insert({
      joven_id: subjectUserId, created_by: subjectUserId, relationship_type: "tutor",
      code_hash: hashCode(code), expires_at: expiresAt
    });
    if (!error) return { code, expiresAt };
    if (error.code !== "23505") fail(error);
  }
  throw new HttpError(503, "No se pudo generar un código. Inténtalo de nuevo.", "INVITE_GENERATION_FAILED");
}

export async function redeemInvite(relatedUserId: string, codeInput: unknown, relationshipInput: unknown, basisInput: unknown) {
  if (typeof codeInput !== "string" || !/^[A-HJ-NP-Z2-9]{8}$/i.test(codeInput.trim())) throw new HttpError(400, "El código no es válido.", "INVITE_CODE_INVALID");
  if (typeof relationshipInput !== "string" || !relationshipLabels.has(relationshipInput)) throw new HttpError(400, "El tipo de vínculo no es válido.", "RELATIONSHIP_TYPE_INVALID");
  if (basisInput !== "subject_consent" && basisInput !== "legal_representation") throw new HttpError(400, "La base de autorización no es válida.", "AUTHORITY_BASIS_INVALID");

  const now = new Date().toISOString();
  const { data: invite, error: lookupError } = await supabaseAdmin.from("relationship_invites")
    .select("id,joven_id,expires_at,used_at,revoked_at")
    .eq("code_hash", hashCode(codeInput.trim().toUpperCase())).maybeSingle();
  if (lookupError) fail(lookupError);
  if (!invite || invite.used_at || invite.revoked_at || new Date(invite.expires_at).getTime() <= Date.now()) throw new HttpError(404, "El código no existe, venció o ya fue utilizado.", "INVITE_CODE_UNAVAILABLE");
  if (invite.joven_id === relatedUserId) throw new HttpError(400, "No puedes vincular tu cuenta contigo mismo.", "SELF_RELATIONSHIP_NOT_ALLOWED");

  const { data: existing, error: existingError } = await supabaseAdmin.from("relationships")
    .select("id,status").eq("joven_id", invite.joven_id).eq("related_user_id", relatedUserId).maybeSingle();
  if (existingError) fail(existingError);
  if (existing && ["pending", "approved"].includes(existing.status)) throw new HttpError(409, "Ya existe una solicitud o vinculación para estas cuentas.", "RELATIONSHIP_ALREADY_EXISTS");

  const { data: relationship, error: insertError } = await supabaseAdmin.from("relationships").insert({
    joven_id: invite.joven_id, related_user_id: relatedUserId, relationship_type: "tutor", status: "pending",
    authority_basis: basisInput, relationship_label: relationshipInput
  }).select("*").single();
  if (insertError) fail(insertError);

  const { data: consumed, error: consumeError } = await supabaseAdmin.from("relationship_invites")
    .update({ used_at: now, used_by: relatedUserId }).eq("id", invite.id).is("used_at", null)
    .is("revoked_at", null).gt("expires_at", now).select("id").maybeSingle();
  if (consumeError || !consumed) {
    await supabaseAdmin.from("relationships").delete().eq("id", relationship.id).eq("status", "pending");
    if (consumeError) fail(consumeError);
    throw new HttpError(409, "El código ya fue utilizado o venció. Solicita uno nuevo.", "INVITE_CODE_UNAVAILABLE");
  }
  await audit(relatedUserId, "relationship.requested", "relationship", relationship.id, { authority_basis: basisInput });
  return shape(relationship);
}

export async function listRelationships(userId: string) {
  const { data, error } = await supabaseAdmin.from("relationships").select("*")
    .or(`joven_id.eq.${userId},related_user_id.eq.${userId}`).order("created_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []).map(shape);
}

export async function respondToRelationship(userId: string, relationshipId: unknown, action: unknown) {
  if (typeof relationshipId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(relationshipId)) throw new HttpError(400, "La solicitud no es válida.", "RELATIONSHIP_ID_INVALID");
  if (!["accept", "reject", "revoke"].includes(String(action))) throw new HttpError(400, "La acción no es válida.", "RELATIONSHIP_ACTION_INVALID");
  const { data: current, error: readError } = await supabaseAdmin.from("relationships").select("*").eq("id", relationshipId).maybeSingle();
  if (readError) fail(readError);
  if (!current) throw new HttpError(404, "No se encontró la solicitud.", "RELATIONSHIP_NOT_FOUND");
  const isSubject = current.joven_id === userId;
  const isRelated = current.related_user_id === userId;
  if (action === "accept" || action === "reject") {
    if (!isSubject) throw new HttpError(403, "Solo la persona titular puede responder esta solicitud.", "RELATIONSHIP_FORBIDDEN");
    if (current.status !== "pending") throw new HttpError(409, "La solicitud ya fue respondida.", "RELATIONSHIP_NOT_PENDING");
    if (action === "accept" && current.authority_basis !== "subject_consent") throw new HttpError(403, "La representación legal requiere verificación administrativa.", "LEGAL_REPRESENTATION_REQUIRES_REVIEW");
    if (action === "reject") {
      const { data, error } = await supabaseAdmin.from("relationships").update({ status: "rejected" }).eq("id", relationshipId).eq("status", "pending").select("*").single();
      if (error) fail(error); return shape(data);
    }
    const { error: consentError } = await supabaseAdmin.from("relationship_consents").insert({
      relationship_id: relationshipId, granted_by: userId, scopes: consentScopes
    });
    if (consentError) fail(consentError);
    const { data, error } = await supabaseAdmin.from("relationships").update({ status: "approved" }).eq("id", relationshipId).eq("status", "pending").select("*").maybeSingle();
    if (error || !data) {
      await supabaseAdmin.from("relationship_consents").update({ revoked_at: new Date().toISOString() }).eq("relationship_id", relationshipId).is("revoked_at", null);
      if (error) fail(error); throw new HttpError(409, "La solicitud cambió mientras se procesaba.", "RELATIONSHIP_CONFLICT");
    }
    await audit(userId, action === "accept" ? "relationship.approved" : "relationship.rejected", "relationship", relationshipId);
    return shape(data);
  }
  if (!isSubject && !isRelated) throw new HttpError(403, "No participas en esta vinculación.", "RELATIONSHIP_FORBIDDEN");
  if (!["pending", "approved"].includes(current.status)) throw new HttpError(409, "La vinculación ya no está activa.", "RELATIONSHIP_NOT_ACTIVE");
  const now = new Date().toISOString();
  const { error: consentError } = await supabaseAdmin.from("relationship_consents").update({ revoked_at: now }).eq("relationship_id", relationshipId).is("revoked_at", null);
  if (consentError) fail(consentError);
  const { data, error } = await supabaseAdmin.from("relationships").update({ status: "revoked" }).eq("id", relationshipId).in("status", ["pending", "approved"]).select("*").single();
  if (error) fail(error);
  await audit(userId, "relationship.revoked", "relationship", relationshipId);
  return shape(data);
}
