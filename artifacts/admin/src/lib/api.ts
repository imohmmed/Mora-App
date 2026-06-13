const STORAGE_KEY = "mora_admin_token";

export function getAdminToken(): string {
  try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
}

export function setAdminToken(token: string) {
  try { localStorage.setItem(STORAGE_KEY, token); } catch {}
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("mora_admin_user");
  } catch {}
}

export async function adminFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<{ data: T; meta: Record<string, unknown>; error: string | null }> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearAdminToken();
    window.location.href = "/login";
    return { data: null as unknown as T, meta: {}, error: "Unauthorized" };
  }

  return res.json();
}
