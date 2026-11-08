import { supabaseAdmin } from "../config/supabase";

export async function audit(actorId: string | null, eventType: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  const { error } = await supabaseAdmin.from("audit_events").insert({ actor_id: actorId, event_type: eventType, entity_type: entityType, entity_id: entityId ?? null, metadata });
  if (error) console.error("[audit-error]", { code: error.code, message: String(error.message ?? "").slice(0, 160) });
}
