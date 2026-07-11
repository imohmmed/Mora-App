import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";

const STORAGE_KEY = "mora_active_exchange_v2";

export type ActiveExchange = {
  requestId: string;
  orderNumber: string;
  customerId: string;
};

type ExchangeContextValue = {
  activeExchange: ActiveExchange | null;
  startExchange: (ex: ActiveExchange) => void;
  clearExchange: () => void;
};

const ExchangeContext = createContext<ExchangeContextValue>({
  activeExchange: null,
  startExchange: () => {},
  clearExchange: () => {},
});

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<ActiveExchange | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ActiveExchange;
          if (parsed?.requestId && parsed?.customerId) setStored(parsed);
        }
      } catch { /* ignore */ }
      setLoaded(true);
    })();
  }, []);

  // Drop persisted state that belongs to a different (or logged-out) customer.
  useEffect(() => {
    if (!loaded || !stored) return;
    if (!user?.id || stored.customerId !== user.id) {
      setStored(null);
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  }, [loaded, stored, user?.id]);

  const startExchange = useCallback((ex: ActiveExchange) => {
    setStored(ex);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ex)).catch(() => {});
  }, []);

  const clearExchange = useCallback(() => {
    setStored(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const activeExchange = stored && user?.id && stored.customerId === user.id ? stored : null;

  return (
    <ExchangeContext.Provider value={{ activeExchange, startExchange, clearExchange }}>
      {children}
    </ExchangeContext.Provider>
  );
}

export function useExchange(): ExchangeContextValue {
  return useContext(ExchangeContext);
}
