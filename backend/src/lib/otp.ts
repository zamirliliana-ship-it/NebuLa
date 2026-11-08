import { createHmac, randomInt } from "node:crypto";
import { env } from "../config/env";

export type OtpPurpose = "verify_email" | "reset_password";

/** Código de 6 dígitos con CSPRNG (nunca Math.random). */
export const generateCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, "0");

/** HMAC con pepper: si se filtra la tabla, los códigos no se pueden recuperar sin el pepper. */
export const hashCode = (email: string, purpose: OtpPurpose, code: string): string =>
  createHmac("sha256", env.OTP_PEPPER).update(`${purpose}:${email}:${code}`).digest("hex");
