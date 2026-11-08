import { createHash } from "node:crypto";
import type { Request } from "express";
import rateLimit from "express-rate-limit";

const tooMany = { success: false, message: "Demasiados intentos. Inténtalo más tarde." };
const common = { standardHeaders: true, legacyHeaders: false, message: tooMany } as const;

/** Tope general por IP. */
export const globalLimiter = rateLimit({ ...common, windowMs: 15 * 60_000, limit: 200 });

/** Tope por IP para rutas de autenticación. */
export const authIpLimiter = rateLimit({ ...common, windowMs: 15 * 60_000, limit: 30 });

/** Tope por correo (hash): frena ataques distribuidos contra una misma cuenta. */
export const emailLimiter = (limit: number) =>
  rateLimit({
    ...common,
    windowMs: 15 * 60_000,
    limit,
    keyGenerator: (req: Request) =>
      "e:" + createHash("sha256").update(String(req.body?.email ?? "none")).digest("hex")
  });
