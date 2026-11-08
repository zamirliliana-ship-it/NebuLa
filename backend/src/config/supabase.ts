import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const opts = { auth: { autoRefreshToken: false, persistSession: false } } as const;

/** Cliente con service_role: solo backend, solo para operaciones administrativas. */
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts);

/** Cliente efímero con clave publicable, para validar credenciales de login. */
export const createPublicClient = () =>
  createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, opts);
