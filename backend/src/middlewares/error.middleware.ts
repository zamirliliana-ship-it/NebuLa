import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/errors";

export const notFound = (_req: Request, res: Response) =>
  res.status(404).json({ success: false, message: "Ruta no encontrada." });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, message: err.message, code: err.code });
    return;
  }
  // Registrar solo metadatos técnicos; nunca tokens, cabeceras, cuerpos ni datos personales.
  const candidate = (typeof err === "object" && err !== null) ? err as { name?: unknown; code?: unknown; status?: unknown } : {};
  const safeName = typeof candidate.name === "string" ? candidate.name : "UnknownError";
  const safeCode = typeof candidate.code === "string" ? candidate.code : "NO_CODE";
  const safeStatus = typeof candidate.status === "number" ? candidate.status : 500;
  console.error("[api-error]", JSON.stringify({
    method: req.method,
    path: req.path,
    name: safeName,
    code: safeCode,
    status: safeStatus
  }));
  res.status(500).json({ success: false, message: "Error interno del servidor." });
};
