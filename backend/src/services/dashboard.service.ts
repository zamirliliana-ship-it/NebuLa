import { supabaseAdmin } from "../config/supabase";
import { HttpError } from "../lib/errors";

type Role = "autistic_person" | "parent_guardian" | "teacher" | "admin";
const roleMap: Record<string, Role> = { joven: "autistic_person", autistic_person: "autistic_person", tutor: "parent_guardian", parent_guardian: "parent_guardian", profesor: "teacher", teacher: "teacher", admin: "admin" };
function fail(error: any): never { console.error("[dashboard-db-error]", { code: error?.code, message: String(error?.message ?? "").slice(0,160) }); throw new HttpError(500,"No se pudo cargar el dashboard.","DASHBOARD_LOAD_FAILED"); }
async function rows(table: string, query: (q: any) => any) { const { data, error } = await query(supabaseAdmin.from(table).select("*")); if (error) fail(error); return data ?? []; }
async function permittedStudents(userId: string, scope: string, role: "parent_guardian" | "teacher") {
  if (role === "parent_guardian") {
    const { data, error } = await supabaseAdmin.from("relationships").select("id,joven_id,relationship_label,status,relationship_consents!inner(scopes,revoked_at,expires_at)").eq("related_user_id",userId).eq("status","approved").is("relationship_consents.revoked_at",null);
    if (error) fail(error);
    return [...new Set((data ?? []).filter((r: any) => {
      const consents = Array.isArray(r.relationship_consents) ? r.relationship_consents : r.relationship_consents ? [r.relationship_consents] : [];
      return consents.some((c:any) => !c.revoked_at && (!c.expires_at || new Date(c.expires_at).getTime() > Date.now()) && (c.scopes ?? []).includes(scope));
    }).map((r: any) => r.joven_id))];
  }
  const { data, error } = await supabaseAdmin.from("teacher_student_access").select("student_user_id,institution_id").eq("teacher_user_id",userId).eq("status","approved").not("institution_approved_at","is",null).not("platform_approved_at","is",null).contains("scopes",[scope]);
  if (error) fail(error);
  const institutionIds = [...new Set((data ?? []).map((r: any) => r.institution_id))];
  if (!institutionIds.length) return [];
  const { data: institutions, error: institutionError } = await supabaseAdmin.from("institutions").select("id").in("id",institutionIds).eq("active",true).eq("verification_status","verified");
  if (institutionError) fail(institutionError);
  const verified = new Set((institutions ?? []).map((i:any)=>i.id));
  return [...new Set((data ?? []).filter((r:any)=>verified.has(r.institution_id)).map((r:any)=>r.student_user_id))];
}
export async function getDashboard(userId: string, assignedRole?: unknown) {
  const { data: profile, error } = await supabaseAdmin.from("profiles").select("id,role,full_name,display_name,avatar_url,institution_id,preferences,created_at").eq("id",userId).maybeSingle();
  if (error) fail(error); if (!profile) throw new HttpError(404,"No encontramos tu perfil.","PROFILE_NOT_FOUND");
  const role = (typeof assignedRole === "string" && roleMap[assignedRole]) ? roleMap[assignedRole] : roleMap[profile.role]; if (!role || (role === "admin" && profile.role !== "admin")) throw new HttpError(403,"Tu rol no tiene acceso al dashboard.","DASHBOARD_ROLE_INVALID");
  const base = { role, profile: { id: profile.id, name: profile.display_name || profile.full_name, avatarUrl: profile.avatar_url, institutionId: profile.institution_id } };
  if (role === "autistic_person") {
    const [emotions, observations, plans, alerts, relationships] = await Promise.all([
      rows("emotion_entries",q=>q.eq("joven_id",userId).order("created_at",{ascending:false}).limit(12)),
      rows("daily_observations",q=>q.eq("joven_id",userId).order("observation_date",{ascending:false}).limit(10)),
      rows("student_support_plans",q=>q.eq("joven_id",userId).order("updated_at",{ascending:false}).limit(10)),
      rows("support_alerts",q=>q.eq("joven_id",userId).order("created_at",{ascending:false}).limit(10)),
      rows("relationships",q=>q.eq("joven_id",userId).order("created_at",{ascending:false}))
    ]); return { ...base, data:{ emotions, observations, plans, alerts, relationships } };
  }
  if (role === "parent_guardian" || role === "teacher") {
    const ids = await permittedStudents(userId, "observations", role);
    const [studentRows, observations] = await Promise.all([
      ids.length ? rows("profiles",q=>q.in("id",ids).select("id,display_name,full_name,avatar_url")) : Promise.resolve([]),
      ids.length ? rows("daily_observations",q=>q.in("joven_id",ids).eq("visibility",role === "teacher" ? "authorized_team" : "tutor_shared").order("observation_date",{ascending:false}).limit(30)) : Promise.resolve([])
    ]);
    const emotionalIds = await permittedStudents(userId,"emotional_data",role);
    const reportIds = await permittedStudents(userId,"reports",role);
    const planIds = await permittedStudents(userId,"support_plans",role);
    const alertIds = await permittedStudents(userId,"alerts",role);
    const [emotions,reports,plans,alerts] = await Promise.all([
      emotionalIds.length ? rows("emotion_entries",q=>q.in("joven_id",emotionalIds).order("created_at",{ascending:false}).limit(20)) : Promise.resolve([]),
      reportIds.length ? rows("school_reports",q=>q.in("joven_id",reportIds).order("created_at",{ascending:false}).limit(20)) : Promise.resolve([]),
      planIds.length ? rows("student_support_plans",q=>q.in("joven_id",planIds).order("updated_at",{ascending:false}).limit(20)) : Promise.resolve([]),
      alertIds.length ? rows("support_alerts",q=>q.in("joven_id",alertIds).order("created_at",{ascending:false}).limit(20)) : Promise.resolve([])
    ]);
    return { ...base, data:{ students:studentRows, observations, emotions, reports, plans, alerts, accessScopes:{ observations:ids, emotional_data:emotionalIds, reports:reportIds, support_plans:planIds, alerts:alertIds } } };
  }
  const [users,institutions,relationships,teacherAccess,audit] = await Promise.all([
    rows("profiles",q=>q.select("id,role,full_name,display_name,avatar_url,institution_id,created_at").order("created_at",{ascending:false}).limit(100)),
    rows("institutions",q=>q.order("created_at",{ascending:false}).limit(100)),
    rows("relationships",q=>q.order("created_at",{ascending:false}).limit(100)),
    rows("teacher_student_access",q=>q.order("created_at",{ascending:false}).limit(100)),
    rows("audit_events",q=>q.order("created_at",{ascending:false}).limit(100))
  ]);
  return { ...base, data:{ users, institutions, relationships, teacherAccess, audit } };
}
export async function createEmotion(userId:string,input:any) {
 const emotion=String(input?.emotion??"").trim(); const intensity=Number(input?.intensity); const note=typeof input?.note==="string"?input.note.trim():null;
 if(!emotion || emotion.length>60 || !Number.isInteger(intensity) || intensity<1 || intensity>5 || (note && note.length>1000)) throw new HttpError(400,"Revisa emoción, intensidad y nota.","EMOTION_INVALID");
 const {data,error}=await supabaseAdmin.from("emotion_entries").insert({joven_id:userId,emotion,intensity,note,source:"self_report"}).select("id,joven_id,emotion,intensity,note,created_at").single(); if(error) fail(error); return data;
}
export async function createObservation(userId:string,role:string,input:any) {
 const studentId=String(input?.studentId??""); const content=String(input?.content??"").trim(); const visibility=input?.visibility;
 if(!studentId || !content || content.length>4000 || !["private","authorized_team","tutor_shared"].includes(visibility)) throw new HttpError(400,"La observación no es válida.","OBSERVATION_INVALID");
 const scope=visibility==="tutor_shared"?"observations":"observations";
 const allowed=await permittedStudents(userId,scope,role as "parent_guardian"|"teacher"); if(!allowed.includes(studentId)) throw new HttpError(403,"No tienes autorización para registrar observaciones de esta persona.","STUDENT_ACCESS_FORBIDDEN");
 if(role!=="teacher") throw new HttpError(403,"Solo docentes autorizados pueden registrar observaciones educativas.","OBSERVATION_ROLE_FORBIDDEN");
 const {data,error}=await supabaseAdmin.from("daily_observations").insert({joven_id:studentId,author_id:userId,content,visibility,category:"educational"}).select("*").single(); if(error) fail(error); return data;
}
