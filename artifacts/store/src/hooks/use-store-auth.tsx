import { useState, useEffect, useCallback } from "react";

const TOKEN_KEY = "mora_store_token";
const BASE = "/api";

export type StoreUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: Record<string, string>;
};

export function useStoreAuth() {
  const [user, setUser] = useState<StoreUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) { setIsLoading(false); return; }
    fetch(`${BASE}/store/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then(({ data }) => {
        if (data?.id) { setToken(t); setUser(data); }
        else localStorage.removeItem(TOKEN_KEY);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE}/store/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json() as { data: { token: string; user: StoreUser }; error?: string };
    if (!res.ok) throw new Error(json.error || "Login failed");
    const { token: t, user: u } = json.data;
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (firstName: string, lastName: string, email: string, password: string) => {
    const res = await fetch(`${BASE}/store/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });
    const json = await res.json() as { data: { token: string; user: StoreUser }; error?: string };
    if (!res.ok) throw new Error(json.error || "Registration failed");
    const { token: t, user: u } = json.data;
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const updateProfile = useCallback(async (patch: { phone?: string; address?: Record<string, string> }) => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return;
    const res = await fetch(`${BASE}/store/auth/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify(patch),
    });
    const json = await res.json() as { data: StoreUser | null; error?: string };
    if (res.ok && json.data) setUser(json.data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, isLoading, login, register, updateProfile, logout };
}
