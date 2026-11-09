import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { HttpError } from "../lib/errors";
import { supabaseAdmin } from "../config/supabase";
import { verifiedSessionUser } from "../services/session.service";

export type NebulaRole =
  | "autistic_person"
  | "parent_guardian"
  | "teacher"
  | "admin";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
    emailConfirmed: boolean;
    role: NebulaRole;
    accessToken: string;
  };
};

function roleFrom(
  user: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  },
  profileRole?: string | null,
): NebulaRole | null {
  if (profileRole === "admin") {
    return "admin";
  }

  const app = user.app_metadata?.nebula_account_type;

  const expected: Record<string, string> = {
    autistic_person: "joven",
    parent_guardian: "tutor",
    teacher: "profesor",
    admin: "admin",
  };

  if (typeof app === "string" && expected[app]) {
    return expected[app] === profileRole
      ? (app as NebulaRole)
      : null;
  }

  const map: Record<string, NebulaRole> = {
    joven: "autistic_person",
    tutor: "parent_guardian",
    profesor: "teacher",
    admin: "admin",
  };

  return profileRole
    ? map[profileRole] ?? null
    : null;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = req
      .header("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      throw new HttpError(
        401,
        "Debes iniciar sesión.",
        "AUTH_REQUIRED",
      );
    }

    const user = await verifiedSessionUser(token);

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const role = roleFrom(user, profile?.role);

    if (!role) {
      throw new HttpError(
        403,
        "Tu cuenta todavía no tiene un rol válido.",
        "ACCOUNT_ROLE_INVALID",
      );
    }

    if (
      role === "admin" &&
      user.assuranceLevel !== "aal2"
    ) {
      throw new HttpError(
        403,
        "Verifica tu segundo factor para acceder a la administración.",
        "MFA_REQUIRED",
      );
    }

    req.user = {
      id: user.id,
      email: user.email,
      emailConfirmed: true,
      role,
      accessToken: token,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(...roles: NebulaRole[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      return next(
        new HttpError(
          401,
          "Debes iniciar sesión.",
          "AUTH_REQUIRED",
        ),
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new HttpError(
          403,
          "No tienes permisos para esta operación.",
          "ROLE_FORBIDDEN",
        ),
      );
    }

    next();
  };
}