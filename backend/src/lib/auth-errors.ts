import { HttpError } from "./errors";

// Un fallo temporal de Supabase no significa que la sesión sea inválida.
export function rejectTransientAuthFailure(
  error: {
    status?: number;
    name?: string;
  } | null,
) {
  if (
    error &&
    (
      error.status === 0 ||
      (error.status ?? 0) >= 500 ||
      error.name === "AuthRetryableFetchError" ||
      error.status === 429
    )
  ) {
    throw new HttpError(
      error.status === 429 ? 429 : 503,
      "El servicio de autenticación no está disponible temporalmente. Inténtalo de nuevo.",
      "AUTH_TEMPORARILY_UNAVAILABLE",
    );
  }
}