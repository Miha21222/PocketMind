const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

let authToken = "";

export function setAuthToken(token: string): void {
  authToken = token;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

// Multipart upload (e.g. audio). Lets the browser set the multipart boundary,
// so Content-Type is intentionally not forced here.
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers = new Headers();
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", body: formData, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}
