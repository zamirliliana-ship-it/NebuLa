import { supabaseAdmin } from "../config/supabase";
import { HttpError } from "../lib/errors";
import { rejectTransientAuthFailure } from "../lib/auth-errors";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Utilizar solamente después de validar el token con Supabase Auth.
export function tokenAssurance(
  token: string,
): "aal1" | "aal2" {
  try {
    const payload = JSON.parse(
      Buffer.from(
        token.split(".")[1],
        "base64url",
      ).toString("utf8"),
    );

    return payload.aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return "aal1";
  }
}

export async function verifiedSessionUser(token: string) {
  const { data, error } =
    await supabaseAdmin.auth.getUser(token);

  rejectTransientAuthFailure(error);

  if (error || !data.user) {
    throw new HttpError(
      401,
      "La sesión no es válida. Inicia sesión nuevamente.",
      "INVALID_SESSION",
    );
  }

  if (!data.user.email_confirmed_at) {
    throw new HttpError(
      403,
      "Debes verificar tu correo.",
      "EMAIL_NOT_VERIFIED",
    );
  }

  let sessionId: unknown;

  try {
    const payload = JSON.parse(
      Buffer.from(
        token.split(".")[1],
        "base64url",
      ).toString("utf8"),
    );

    sessionId = payload.session_id;
  } catch {
    throw new HttpError(
      401,
      "La sesión no es válida.",
      "INVALID_SESSION",
    );
  }

  if (
    typeof sessionId !== "string" ||
    !uuid.test(sessionId)
  ) {
    throw new HttpError(
      401,
      "La sesión no es válida.",
      "INVALID_SESSION",
    );
  }

  const result = await supabaseAdmin.rpc(
    "nebula_session_active",
    {
      p_user_id: data.user.id,
      p_session_id: sessionId,
    },
  );

  if (result.error) {
    throw new HttpError(
      503,
      "No se pudo verificar la sesión. Inténtalo de nuevo.",
      "SESSION_CHECK_UNAVAILABLE",
    );
  }

  if (result.data !== true) {
    throw new HttpError(
      401,
      "La sesión terminó. Inicia sesión nuevamente.",
      "SESSION_REVOKED",
    );
  }

  return {
    ...data.user,
    assuranceLevel: tokenAssurance(token),
  };
}