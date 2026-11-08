
import { createPublicClient, supabaseAdmin } from "../config/supabase";

async function resolveAccountType(user: { id: string; app_metadata?: Record<string, unknown> }) {
  const assigned = user.app_metadata?.nebula_account_type;
  if (assigned === "autistic_person" || assigned === "parent_guardian" || assigned === "teacher") return assigned;
  const { data } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin" ? "admin" : null;
}
import { HttpError } from "../lib/errors";
import type { OtpPurpose } from "../lib/otp";
import { sendOtpEmail } from "./mailer.service";
import { issueOtp, verifyOtp } from "./otp.service";
import { audit } from "./audit.service";

const INVALID_CODE = new HttpError(400, "Código inválido o expirado.");

async function findUser(
  email: string
): Promise<{ id: string; confirmed: boolean } | null> {
  const { data, error } = await supabaseAdmin.rpc(
    "get_auth_user_by_email",
    { p_email: email }
  );

  if (error) throw error;

  return data?.[0] ?? null;
}

/**
 * Genera y envía un OTP.
 *
 * No informa éxito si:
 * - Se alcanzó el límite de envíos.
 * - Apps Script no respondió correctamente.
 * - Apps Script rechazó la firma o la solicitud.
 * - Falló el envío del correo.
 */
async function sendOtp(
  email: string,
  purpose: OtpPurpose
): Promise<void> {
  const code = await issueOtp(email, purpose);

  // No se debe continuar como si el correo se hubiera enviado.
  if (!code) {
    throw new HttpError(
      429,
      "Debes esperar antes de solicitar otro código. Inténtalo nuevamente en un minuto.",
      "OTP_COOLDOWN"
    );
  }

  try {
    await sendOtpEmail(email, purpose, code);

    console.info("[mail] Solicitud OTP entregada a Apps Script.");

  } catch (error) {
    // No registrar correo, código OTP, firma ni secreto.
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";

    console.error("[mail] Falló el envío del OTP:", errorMessage);

    // Propagar el error para que el frontend no reciba un falso éxito.
    throw new HttpError(
      502,
      "No fue posible enviar el código de verificación. Inténtalo nuevamente más tarde.",
      "OTP_DELIVERY_FAILED"
    );
  }
}

/**
 * Registro de usuarios.
 */
export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  const existing = await findUser(input.email);

  // No revelar si una cuenta ya está registrada y verificada.
  if (existing?.confirmed) return;

  if (!existing) {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: false,
      user_metadata: {
        full_name: input.fullName
      }
    });

    if (error && error.code !== "email_exists") {
      throw error;
    }
  }

  // Si ya existía sin verificar, no modificamos su contraseña.
  await sendOtp(input.email, "verify_email");
}

/**
 * Verificación del correo.
 */
export async function verifyEmail(
  email: string,
  code: string
) {
  if (!(await verifyOtp(email, "verify_email", code))) {
    throw INVALID_CODE;
  }

  const user = await findUser(email);

  if (!user) {
    throw INVALID_CODE;
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { email_confirm: true }
  );

  if (error) throw error;
}

/**
 * Reenvío de verificación.
 */
export async function resendVerification(email: string) {
  const user = await findUser(email);

  if (user && !user.confirmed) {
    await sendOtp(email, "verify_email");
  }
}

/**
 * Solicitud de recuperación de contraseña.
 */
export async function forgotPassword(email: string) {
  const user = await findUser(email);

  if (user?.confirmed) {
    await sendOtp(email, "reset_password");
  }
}

/**
 * Restablecimiento de contraseña.
 */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
) {
  if (!(await verifyOtp(email, "reset_password", code))) {
    throw INVALID_CODE;
  }

  const user = await findUser(email);

  if (!user?.confirmed) {
    throw INVALID_CODE;
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );

  if (error) throw error;

  // Cierra todas las sesiones abiertas.
  const { error: revokeError } = await supabaseAdmin.rpc(
    "revoke_user_sessions",
    { p_user_id: user.id }
  );

  if (revokeError) throw revokeError;
}

/**
 * Inicio de sesión.
 */
export async function login(
  email: string,
  password: string
) {
  const { data, error } = await createPublicClient()
    .auth.signInWithPassword({
      email,
      password
    });

  if (error || !data.session) {
    if (error?.code === "email_not_confirmed") {
      throw new HttpError(
        403,
        "Debes verificar tu correo antes de iniciar sesión.",
        "EMAIL_NOT_VERIFIED"
      );
    }

    throw new HttpError(
      401,
      "Correo o contraseña incorrectos."
    );
  }

  const { session, user } = data;
  await audit(user.id, "auth.login", "user", user.id, { outcome: "success" });

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name ?? null,
      accountType: await resolveAccountType(user)
    }
  };
}

/**
 * Renueva una sesión usando el refresh token.
 */
export async function refreshSession(
  refreshToken: string
) {
  const { data, error } = await createPublicClient()
    .auth.refreshSession({
      refresh_token: refreshToken
    });

  if (error || !data.session || !data.user) {
    throw new HttpError(
      401,
      "La sesión expiró. Inicia sesión nuevamente.",
      "SESSION_EXPIRED"
    );
  }

  const { session, user } = data;
  await audit(user.id, "auth.login", "user", user.id, { outcome: "success" });

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name ?? null,
      accountType: await resolveAccountType(user)
    }
  };
}

/**
 * Guarda la selección inicial de tipo de cuenta en app_metadata,
 * que solo modifica el backend con privilegios administrativos.
 */
export async function setAccountType(
  accessToken: string,
  accountType: "autistic_person" | "parent_guardian" | "teacher"
) {
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user || !data.user.email_confirmed_at) {
    throw new HttpError(401, "Debes verificar tu correo e iniciar sesión.", "EMAIL_NOT_VERIFIED");
  }

  const current = data.user.app_metadata?.nebula_account_type;
  if (current) {
    throw new HttpError(409, "El tipo de cuenta ya fue seleccionado. Contacta con soporte si necesitas corregirlo.", "ACCOUNT_TYPE_ALREADY_SET");
  }

  const appMetadata = { ...data.user.app_metadata, nebula_account_type: accountType };
  const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    data.user.id,
    { app_metadata: appMetadata }
  );
  if (updateError || !updated.user) throw updateError ?? new Error("No se pudo guardar el tipo de cuenta.");

  const databaseRole = accountType === "autistic_person" ? "joven" : accountType === "parent_guardian" ? "tutor" : "profesor";
  const { error: profileRoleError } = await supabaseAdmin.from("profiles").update({ role: databaseRole, updated_at: new Date().toISOString() }).eq("id", data.user.id);
  if (profileRoleError) {
    console.error("[account-role-sync-error]", { code: profileRoleError.code, message: profileRoleError.message?.slice(0, 160) });
    throw new HttpError(500, "No se pudo sincronizar el tipo de cuenta. Contacta con soporte.", "ACCOUNT_ROLE_SYNC_FAILED");
  }

  return {
    id: updated.user.id,
    email: updated.user.email,
    fullName: updated.user.user_metadata?.full_name ?? null,
    accountType
  };
}

/**
 * Obtiene el usuario autenticado validando su JWT contra Auth.
 */
export async function getCurrentUser(
  accessToken: string
) {
  const { data, error } = await supabaseAdmin.auth.getUser(
    accessToken
  );

  if (error || !data.user) {
    throw new HttpError(
      401,
      "La sesión no es válida. Inicia sesión nuevamente.",
      "INVALID_SESSION"
    );
  }

  const user = data.user;

  return {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name ?? null,
    accountType: await resolveAccountType(user)
  };
}

/**
 * Revoca únicamente la sesión asociada al access token recibido.
 */
export async function logout(
  accessToken: string
): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.signOut(
    accessToken,
    "local"
  );

  if (error) {
    throw new HttpError(
      401,
      "La sesión no es válida o ya expiró.",
      "INVALID_SESSION"
    );
  }
}
