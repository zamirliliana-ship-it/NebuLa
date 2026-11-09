import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const guardedFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    signal: AbortSignal.any([
      ...(init?.signal ? [init.signal] : []),
      AbortSignal.timeout(10_000),
    ]),
  });

const opts = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: guardedFetch,
  },
} as const;

// Solo se utiliza dentro del backend.
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  opts,
);

// Cliente independiente para validar credenciales.
export const createPublicClient = () =>
  createClient(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    opts,
  );