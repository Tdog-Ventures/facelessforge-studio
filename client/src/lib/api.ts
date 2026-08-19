export const DEFAULT_API_BASE = "http://91.99.162.143:8000";
export function getApiBase() { return (localStorage.getItem("vf.apiBase") || import.meta.env.VITE_API_BASE || DEFAULT_API_BASE).replace(/\/$/, ""); }
export const API_BASE = getApiBase();

export async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${getApiBase()}${path}`, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

export function friendlyApiError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return /cors|failed to fetch|network/i.test(text)
    ? "CORS or network error: the API did not allow this browser request. Check the backend CORS policy; this frontend does not modify it."
    : text;
}
