import { createHmac } from "node:crypto";
import type { Request } from "express";

import rateLimit, {
  type Store,
  type Options,
} from "express-rate-limit";

import { env } from "../config/env";
import { supabaseAdmin } from "../config/supabase";
import { HttpError } from "../lib/errors";

const tooMany = {
  success: false,
  message: "Demasiados intentos. Inténtalo más tarde.",
};

const common = {
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
} as const;

export class DatabaseRateLimitStore implements Store {
  localKeys = false;

  private windowMs = 900_000;

  constructor(private namespace: string) {}

  init(options: Options) {
    this.windowMs = options.windowMs;
  }

  private key(value: string) {
    const digest = createHmac(
      "sha256",
      env.OTP_PEPPER,
    )
      .update(`rate-limit:${value}`)
      .digest("hex");

    return `${this.namespace}:${digest}`;
  }

  async increment(value: string) {
    const { data, error } = await supabaseAdmin.rpc(
      "nebula_increment_rate_limit",
      {
        p_key: this.key(value),
        p_window_ms: this.windowMs,
      },
    );

    const row = data?.[0];

    if (
      error ||
      !row ||
      !Number.isFinite(Number(row.total_hits))
    ) {
      throw new HttpError(
        503,
        "La protección de acceso no está disponible. Inténtalo de nuevo.",
        "RATE_LIMIT_UNAVAILABLE",
      );
    }

    return {
      totalHits: Number(row.total_hits),
      resetTime: new Date(row.reset_at),
    };
  }

  async decrement(value: string) {
    const { error } = await supabaseAdmin.rpc(
      "nebula_reset_rate_limit",
      {
        p_key: this.key(value),
        p_decrement: true,
      },
    );

    if (error) {
      throw new HttpError(
        503,
        "No se pudo actualizar la protección de acceso.",
        "RATE_LIMIT_UNAVAILABLE",
      );
    }
  }

  async resetKey(value: string) {
    const { error } = await supabaseAdmin.rpc(
      "nebula_reset_rate_limit",
      {
        p_key: this.key(value),
        p_decrement: false,
      },
    );

    if (error) {
      throw new HttpError(
        503,
        "No se pudo actualizar la protección de acceso.",
        "RATE_LIMIT_UNAVAILABLE",
      );
    }
  }
}

function store(namespace: string) {
  return env.NODE_ENV === "production"
    ? { store: new DatabaseRateLimitStore(namespace) }
    : {};
}

export const globalLimiter = rateLimit({
  ...common,
  ...store("global-ip"),
  windowMs: 15 * 60_000,
  limit: 200,
  skip: (req) => req.path === "/api/health",
});

export const authIpLimiter = rateLimit({
  ...common,
  ...store("auth-ip"),
  windowMs: 15 * 60_000,
  limit: 30,
});

export const emailLimiter = (limit: number) =>
  rateLimit({
    ...common,
    ...store(`auth-email-${limit}`),
    windowMs: 15 * 60_000,
    limit,
    keyGenerator: (req: Request) =>
      createHmac("sha256", env.OTP_PEPPER)
        .update(String(req.body?.email ?? "none"))
        .digest("hex"),
  });