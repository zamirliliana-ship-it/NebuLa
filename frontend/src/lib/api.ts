const API = import.meta.env.VITE_API_URL || "/api";

export type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; status: number; message: string; code?: string };

async function parse<T>(res: Response): Promise<ApiResult<T>> {
  const json = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, data: json.data as T, message: json.message };
  return { ok: false, status: res.status, message: json.message ?? "Error inesperado.", code: json.code };
}

function friendlyNetworkError(error: unknown): ApiResult<never> {
  if (error instanceof DOMException && error.name === "TimeoutError") return { ok: false, status: 0, message: "La solicitud tardó demasiado. Comprueba tu conexión e inténtalo de nuevo." };
  return { ok: false, status: 0, message: "No se pudo conectar con el servidor. Comprueba que Nébula esté ejecutándose." };
}

export async function post<T = unknown>(path: string, body: unknown, accessToken?: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body),
      credentials: "omit",
      signal: AbortSignal.timeout(20_000)
    });
    return parse<T>(res);
  } catch (error) {
    return friendlyNetworkError(error);
  }
}

export async function get<T = unknown>(path: string, accessToken: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: "GET", accessToken });
}

export async function patch<T = unknown>(path: string, body: unknown, accessToken: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: "PATCH", body, accessToken });
}

async function request<T>(path: string, options: { method: "GET" | "PATCH"; body?: unknown; accessToken: string }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API}${path}`, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {})
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      credentials: "omit",
      signal: AbortSignal.timeout(20_000)
    });
    return parse<T>(res);
  } catch (error) {
    return friendlyNetworkError(error);
  }
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: { id: string; email: string; fullName: string | null; accountType: AccountType | null };
}

export type AccountType = "autistic_person" | "parent_guardian" | "teacher" | "admin";
