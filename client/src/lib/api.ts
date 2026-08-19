export const DEFAULT_API_BASE = "http://91.99.162.143:8000";

export function getApiBase(envBase = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE) {
  const browserOverride = typeof localStorage !== "undefined" ? localStorage.getItem("vf.apiBase") : null;
  return (browserOverride || envBase).replace(/\/$/, "");
}

export const API_BASE = getApiBase();

export async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${getApiBase()}${path}`, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("The configured API returned a non-JSON response. Check VITE_API_BASE and the backend route.");
  }
  return response.json();
}

export function friendlyApiError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return /cors|failed to fetch|network|non-json/i.test(text)
    ? "CORS or network error: the API did not allow this browser request. Check VITE_API_BASE and the backend CORS policy; this frontend does not modify it."
    : text;
}
