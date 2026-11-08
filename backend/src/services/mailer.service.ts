
import { createHmac, randomBytes } from "node:crypto";
import { env } from "../config/env";
import type { OtpPurpose } from "../lib/otp";

/**
 * Respuesta del servicio Google Apps Script.
 */
interface AppsScriptResponse {
  ok?: boolean;
  reason?: string;
}

/**
 * Envía el OTP mediante Google Apps Script.
 *
 * La petición se firma con HMAC-SHA256:
 * to|type|code|ts|nonce
 *
 * Apps Script valida:
 * - Firma.
 * - Fecha de la petición.
 * - Nonce de un solo uso.
 * - Formato del código.
 */
export async function sendOtpEmail(
  to: string,
  type: OtpPurpose,
  code: string
): Promise<void> {

  // 1. Validaciones locales.
  if (!env.APPS_SCRIPT_URL) {
    throw new Error("APPS_SCRIPT_URL no está configurada.");
  }

  if (
    !env.APPS_SCRIPT_SECRET ||
    env.APPS_SCRIPT_SECRET.length < 32
  ) {
    throw new Error("APPS_SCRIPT_SECRET no está configurada correctamente.");
  }

  if (!/^\d{6}$/.test(code)) {
    throw new Error("El código OTP tiene un formato inválido.");
  }

  if (
    type !== "verify_email" &&
    type !== "reset_password"
  ) {
    throw new Error("El propósito del OTP no es válido.");
  }

  // 2. Crear marca de tiempo y nonce.
  const ts = Date.now().toString();

  const nonce = randomBytes(16).toString("hex");

  // 3. Generar firma HMAC-SHA256.
  const message = [
    to,
    type,
    code,
    ts,
    nonce
  ].join("|");

  const sig = createHmac(
    "sha256",
    env.APPS_SCRIPT_SECRET
  )
    .update(message, "utf8")
    .digest("hex");

  // 4. Construir solicitud.
  const payload = {
    to,
    type,
    code,
    ts,
    nonce,
    sig
  };

  let response: Response;

  // 5. Enviar petición.
  try {
    response = await fetch(env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: AbortSignal.timeout(20000)
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        throw new Error("Tiempo de espera agotado al contactar Apps Script.");
      }

      throw new Error(
        `No se pudo conectar con Apps Script: ${error.message}`
      );
    }

    throw new Error("Error desconocido al conectar con Apps Script.");
  }

  // 6. Leer respuesta como texto para detectar respuestas no JSON.
  const responseText = await response.text();

  let body: AppsScriptResponse | null = null;

  try {
    body = JSON.parse(responseText) as AppsScriptResponse;
  } catch {
    throw new Error(
      `Apps Script devolvió una respuesta no válida (HTTP ${response.status}).`
    );
  }

  // 7. Comprobar HTTP.
  if (!response.ok) {
    throw new Error(
      `Apps Script respondió HTTP ${response.status}.`
    );
  }

  // 8. Comprobar respuesta funcional.
  if (body?.ok !== true) {
    const reason =
      typeof body?.reason === "string"
        ? body.reason
        : "UNKNOWN_ERROR";

    throw new Error(
      `Apps Script rechazó el envío: ${reason}.`
    );
  }

  // 9. Confirmación sin exponer correo ni código.
  console.info(
    `[mail] Apps Script aceptó el envío OTP (${body.reason ?? "SENT"}).`
  );
}
