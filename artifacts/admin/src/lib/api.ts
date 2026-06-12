const ADMIN_TOKEN = "dev-token-mora";

export async function adminFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<{ data: T; meta: Record<string, unknown>; error: string | null }> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      ...(options?.headers ?? {}),
    },
  });
  return res.json();
}
