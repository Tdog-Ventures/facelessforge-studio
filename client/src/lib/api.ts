export const DEFAULT_API_BASE = "http://91.99.162.143:8000";

export function getApiBase(envBase = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE) {
  return envBase.replace(/\/$/, "");
}

export const API_BASE = getApiBase();

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function withApiAuth(token?: string, headers?: HeadersInit) {
  const next = new Headers(headers);
  if (token) next.set("Authorization", `Bearer ${token}`);
  return next;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${getApiBase()}${path}`, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new ApiRequestError(message);
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const detail = body && typeof body === "object"
      ? String((body as Record<string, unknown>).detail || (body as Record<string, unknown>).message || response.statusText)
      : response.statusText;
    throw new ApiRequestError(`${response.status} ${detail}`, response.status);
  }

  if (!isJson) {
    throw new ApiRequestError("The configured API returned a non-JSON response. Check the API route and VITE_API_BASE.");
  }

  return body as T;
}

export function friendlyApiError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Your session is no longer active. Please sign in again.";
    if (error.status === 403) return "This account does not have permission to perform that action.";
    if (error.status === 404) return "The requested API route is unavailable on the configured service.";
    if (error.status && error.status >= 500) return "The API service reported an error. Please try again shortly.";
  }

  const text = error instanceof Error ? error.message : String(error);
  return /cors|failed to fetch|network|non-json|empty response/i.test(text)
    ? "The configured API is unavailable or did not accept this browser request. No backend changes were attempted."
    : text;
}
