const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const apiBaseUrl = configuredApiUrl?.replace(/\/$/, "") ?? "";

/**
 * Builds a URL for the centralized HTTP API.
 *
 * An empty VITE_API_URL deliberately uses a same-origin relative URL for the
 * web application. The Tauri distribution must set VITE_API_URL because it
 * has no embedded application backend.
 */
export function apiUrl(path: `/${string}`): string {
  return `${apiBaseUrl}${path}`;
}
