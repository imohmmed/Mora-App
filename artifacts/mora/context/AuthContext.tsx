import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "mora_auth_token_v1";

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  ordersCount: number;
  totalSpent: number;
  phone?: string;
  createdAt: string;
};

type AuthCtx = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string, firebaseUid: string) => Promise<void>;
  loginWithSocial: (firebaseUid: string, name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null, token: null, isLoading: true,
  login: async () => {},
  register: async () => {},
  loginWithPhone: async () => {},
  loginWithSocial: async () => {},
  logout: async () => {},
});

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : "/api";
}

async function authFetch<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json() as { data: T; error?: string | null };
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json.data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then(async (t) => {
      if (t) {
        try {
          const u = await authFetch<AuthUser>("/store/auth/me", {}, t);
          setToken(t);
          setUser(u);
        } catch {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      }
      setIsLoading(false);
    });
  }, []);

  const _saveSession = useCallback(async (result: { token: string; user: AuthUser }) => {
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authFetch<{ token: string; user: AuthUser }>("/store/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await _saveSession(result);
  }, [_saveSession]);

  const register = useCallback(async (firstName: string, lastName: string, email: string, password: string) => {
    const result = await authFetch<{ token: string; user: AuthUser }>("/store/auth/register", {
      method: "POST",
      body: JSON.stringify({ firstName, lastName, email, password }),
    });
    await _saveSession(result);
  }, [_saveSession]);

  /** Called after Firebase phone OTP is verified */
  const loginWithPhone = useCallback(async (phone: string, firebaseUid: string) => {
    const result = await authFetch<{ token: string; user: AuthUser }>("/store/auth/firebase", {
      method: "POST",
      body: JSON.stringify({ phone, firebaseUid, provider: "phone" }),
    });
    await _saveSession(result);
  }, [_saveSession]);

  /** Called after Firebase Google or Apple sign-in */
  const loginWithSocial = useCallback(async (firebaseUid: string, name: string, email: string) => {
    const result = await authFetch<{ token: string; user: AuthUser }>("/store/auth/firebase", {
      method: "POST",
      body: JSON.stringify({ firebaseUid, name, email, provider: "social" }),
    });
    await _saveSession(result);
  }, [_saveSession]);

  const logout = useCallback(async () => {
    try {
      if (token) await authFetch("/store/auth/logout", { method: "POST" }, token);
    } catch {}
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, loginWithPhone, loginWithSocial, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
