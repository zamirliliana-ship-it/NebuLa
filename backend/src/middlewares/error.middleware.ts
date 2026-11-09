import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { HttpError } from "../lib/errors";

export const notFound = (
  _req: Request,
  res: Response,
) =>
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada.",
  });

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      success: false,
      message: err.message,
      code: err.code,
    });
    return;
  }

  const parserError = err as {
    type?: string;
  } | null;

  if (parserError?.type === "entity.too.large") {
    res.status(413).json({
      success: false,
      code: "BODY_TOO_LARGE",
      message: "La información supera el tamaño permitido.",
    });
    return;
  }

  if (parserError?.type === "entity.parse.failed") {
    res.status(400).json({
      success: false,
      code: "INVALID_JSON",
      message: "El formato de la solicitud no es válido.",
    });
    return;
  }

  const candidate =
    typeof err === "object" && err !== null
      ? (err as {
          name?: unknown;
          code?: unknown;
          status?: unknown;
        })
      : {};

  const safeName =
    typeof candidate.name === "string"
      ? candidate.name
      : "UnknownError";

  const safeCode =
    typeof candidate.code === "string"
      ? candidate.code
      : "NO_CODE";

  const safeStatus =
    typeof candidate.status === "number"
      ? candidate.status
      : 500;

  // No registrar contraseñas, tokens ni cuerpos de solicitudes.
  console.error(
    "[api-error]",
    JSON.stringify({
      method: req.method,
      path: req.path,
      name: safeName,
      code: safeCode,
      status: safeStatus,
    }),
  );

  res.status(500).json({
    success: false,
    message: "Error interno del servidor.",
  });
};