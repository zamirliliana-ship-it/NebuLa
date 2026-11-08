import { supabaseAdmin } from "../config/supabase";
import { generateCode, hashCode, type OtpPurpose } from "../lib/otp";

const TTL_SECONDS = 600;      // el código vence a los 10 minutos
const COOLDOWN_SECONDS = 60;  // mínimo entre envíos al mismo correo
const MAX_PER_HOUR = 5;       // tope de envíos por hora y correo

/** Crea un código nuevo. Devuelve null si se alcanzó el cooldown o el tope por hora. */
export async function issueOtp(email: string, purpose: OtpPurpose): Promise<string | null> {
  const code = generateCode();
  const { data, error } = await supabaseAdmin.rpc("issue_otp", {
    p_email: email,
    p_purpose: purpose,
    p_code_hash: hashCode(email, purpose, code),
    p_ttl_seconds: TTL_SECONDS,
    p_cooldown_seconds: COOLDOWN_SECONDS,
    p_max_per_hour: MAX_PER_HOUR
  });
  if (error) throw error;
  return data === true ? code : null;
}

/** Verificación atómica en SQL: cuenta intentos (máx. 5) y consume el código al acertar. */
export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("verify_otp", {
    p_email: email,
    p_purpose: purpose,
    p_code_hash: hashCode(email, purpose, code)
  });
  if (error) throw error;
  return data === "ok";
}
