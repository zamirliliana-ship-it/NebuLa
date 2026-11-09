import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  FRONTEND_URL: z.string().min(1).refine(
    (value) =>
      value.split(",").every((origin) => {
        try {
          new URL(origin.trim());
          return true;
        } catch {
          return false;
        }
      }),
    "FRONTEND_URL debe contener URLs válidas separadas por coma",
  ),

  SUPABASE_URL: z.string().url(),

  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),

  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  APPS_SCRIPT_URL: z
    .string()
    .url()
    .startsWith("https://script.google.com/"),

  APPS_SCRIPT_SECRET: z.string().min(32),

  PASSWORD_BREACH_CHECK: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),

  OTP_PEPPER: z.string().min(32),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Variables de entorno inválidas:",
    parsed.error.issues.map((issue) => issue.path.join(".")),
  );

  throw new Error(
    "Configuración del backend incompleta o inválida.",
  );
}

if (parsed.data.APPS_SCRIPT_SECRET === parsed.data.OTP_PEPPER) {
  throw new Error(
    "APPS_SCRIPT_SECRET y OTP_PEPPER deben ser distintos.",
  );
}

if (
  parsed.data.NODE_ENV === "production" &&
  parsed.data.FRONTEND_URL.includes("localhost")
) {
  throw new Error(
    "FRONTEND_URL no puede apuntar a localhost en producción.",
  );
}

for (const value of parsed.data.FRONTEND_URL
  .split(",")
  .map((item) => item.trim())) {
  const origin = new URL(value);

  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.origin !== value
  ) {
    throw new Error(
      "FRONTEND_URL debe contener orígenes exactos sin rutas ni barra final.",
    );
  }

  if (
    parsed.data.NODE_ENV === "production" &&
    origin.protocol !== "https:"
  ) {
    throw new Error(
      "El frontend de producción requiere HTTPS.",
    );
  }
}

const supabaseOrigin = new URL(parsed.data.SUPABASE_URL);

if (
  supabaseOrigin.username ||
  supabaseOrigin.password ||
  (
    parsed.data.NODE_ENV === "production" &&
    supabaseOrigin.protocol !== "https:"
  )
) {
  throw new Error(
    "La URL de Supabase debe ser segura y no contener credenciales.",
  );
}

export const env = parsed.data;