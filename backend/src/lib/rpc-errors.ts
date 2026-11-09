import { HttpError } from "./errors";

export function rpcError(error: { code?: string }): never {
  if (error.code === "42501") {
    throw new HttpError(
      403,
      "No tienes autorización para esta operación.",
      "ACCESS_FORBIDDEN",
    );
  }

  if (error.code === "P0002") {
    throw new HttpError(
      404,
      "El recurso no existe, venció o ya fue utilizado.",
      "RESOURCE_UNAVAILABLE",
    );
  }

  if (error.code === "23505") {
    throw new HttpError(
      409,
      "El recurso cambió o ya existe una solicitud. Actualiza e inténtalo de nuevo.",
      "RESOURCE_CONFLICT",
    );
  }

  if (
    error.code === "22023" ||
    error.code === "22P02"
  ) {
    throw new HttpError(
      400,
      "Los datos de la operación no son válidos.",
      "INVALID_INPUT",
    );
  }

  console.error("[security-rpc-failed]", {
    code: error.code,
  });

  throw new HttpError(
    503,
    "No se pudo completar la operación de forma segura. Inténtalo de nuevo.",
    "SECURITY_OPERATION_UNAVAILABLE",
  );
}