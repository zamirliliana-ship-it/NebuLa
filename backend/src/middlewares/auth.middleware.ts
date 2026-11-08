import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/errors";
import { supabaseAdmin } from "../config/supabase";

export type NebulaRole = "autistic_person" | "parent_guardian" | "teacher" | "admin";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
    emailConfirmed: boolean;
    role: NebulaRole;
    accessToken: string;
  };
};

function roleFrom(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }, profileRole?: string | null): NebulaRole | null {
  const app = user.app_metadata?.nebula_account_type;
  if (app === "autistic_person" || app === "parent_guardian" || app === "teacher" || app === "admin") return app;
  const map: Record<string, NebulaRole> = { joven: "autistic_person", tutor: "parent_guardian", profesor: "teacher", admin: "admin" };
  return profileRole ? map[profileRole] ?? null : null;
}

export async function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const token = req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new HttpError(401, "Debes iniciar sesión.", "AUTH_REQUIRED");
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, "La sesión no es válida. Inicia sesión nuevamente.", "INVALID_SESSION");
    if (!data.user.email_confirmed_at) throw new HttpError(403, "Debes verificar tu correo.", "EMAIL_NOT_VERIFIED");
    const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profileError) throw profileError;
    const role = roleFrom(data.user, profile?.role);
    if (!role) throw new HttpError(403, "Tu cuenta todavía no tiene un rol válido.", "ACCOUNT_ROLE_INVALID");
    req.user = { id: data.user.id, email: data.user.email, emailConfirmed: true, role, accessToken: token };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(...roles: NebulaRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "Debes iniciar sesión.", "AUTH_REQUIRED"));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "No tienes permisos para esta operación.", "ROLE_FORBIDDEN"));
    next();
  };
}
