import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setAdminToken, clearAdminToken, getAdminToken } from "@/lib/api";

export type AdminPermissions = {
  orders: boolean;
  products: boolean;
  customers: boolean;
  analytics: boolean;
  marketing: boolean;
  content: boolean;
  settings: boolean;
};

export type AdminUser = {
  email: string;
  name: string;
  role: "owner" | "admin";
  permissions: AdminPermissions;
  picture?: string | null;
};

type AdminAuthCtx = {
  user: AdminUser | null;
  isLoading: boolean;
  isOwner: boolean;
  login: (idToken: string) => Promise<void>;
  logout: () => void;
  hasPermission: (key: keyof AdminPermissions) => boolean;
};

const Ctx = createContext<AdminAuthCtx | null>(null);

const OWNER_EMAIL = "aaaa35059@gmail.com";
const USER_KEY = "mora_admin_user";

function decodeJwt(token: string): { exp?: number; email?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]!));
  } catch { return null; }
}

function isTokenValid(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now();
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // DEV-ONLY: auto-login with a pre-minted owner token so the authenticated
    // UI can be developed locally (Google OAuth is unavailable in the iframe).
    // Stripped entirely from production builds (import.meta.env.DEV === false).
    if (import.meta.env.DEV) {
      const devToken = import.meta.env.VITE_DEV_ADMIN_TOKEN as string | undefined;
      if (devToken) {
        setAdminToken(devToken);
        const owner: AdminUser = {
          email: OWNER_EMAIL, name: "Owner", role: "owner",
          permissions: { orders: true, products: true, customers: true, analytics: true, marketing: true, content: true, settings: true },
        };
        localStorage.setItem(USER_KEY, JSON.stringify(owner));
        setUser(owner);
        setIsLoading(false);
        return;
      }
    }
    const token = getAdminToken();
    if (token && isTokenValid(token)) {
      try {
        const stored = localStorage.getItem(USER_KEY);
        if (stored) { setUser(JSON.parse(stored)); }
      } catch {}
    } else if (token) {
      // Token expired — clear it
      clearAdminToken();
    }
    setIsLoading(false);
  }, []);

  const login = async (idToken: string) => {
    const res = await fetch("/api/admin/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const json = await res.json() as { data: { token: string; user: AdminUser } | null; error: string | null };
    if (!res.ok || !json.data) throw new Error(json.error || "Login failed");

    setAdminToken(json.data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(json.data.user));
    setUser(json.data.user);
  };

  const logout = () => {
    clearAdminToken();
    setUser(null);
  };

  const hasPermission = (key: keyof AdminPermissions): boolean => {
    if (!user) return false;
    if (user.email === OWNER_EMAIL || user.role === "owner") return true;
    return user.permissions?.[key] === true;
  };

  return (
    <Ctx.Provider value={{ user, isLoading, isOwner: user?.email === OWNER_EMAIL || user?.role === "owner", login, logout, hasPermission }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminAuth must be inside AdminAuthProvider");
  return ctx;
}
