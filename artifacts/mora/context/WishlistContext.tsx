import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trackWishlist } from "@/lib/tracking";
import { useAuth } from "@/context/AuthContext";

const WISHLIST_KEY = "mora_wishlist_v1";

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : "/api";
}

async function fetchServerWishlist(token: string): Promise<string[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/store/auth/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: string[] };
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

async function saveServerWishlist(token: string, ids: string[]): Promise<void> {
  try {
    await fetch(`${getBaseUrl()}/store/auth/wishlist`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids }),
    });
  } catch {}
}

type WishlistContextValue = {
  ids: Set<string>;
  toggle: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  count: number;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const didLoad = useRef(false);
  const prevToken = useRef<string | null>(null);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    AsyncStorage.getItem(WISHLIST_KEY).then((raw) => {
      if (raw) {
        try {
          setIds(new Set(JSON.parse(raw) as string[]));
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((next: Set<string>) => {
    AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify([...next])).catch(() => {});
  }, []);

  useEffect(() => {
    if (prevToken.current === token) return;
    const wasLoggedOut = prevToken.current === null;
    prevToken.current = token;

    if (token && wasLoggedOut) {
      (async () => {
        const serverIds = await fetchServerWishlist(token);
        setIds((local) => {
          const merged = new Set([...local, ...serverIds]);
          AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify([...merged])).catch(() => {});
          saveServerWishlist(token, [...merged]);
          return merged;
        });
      })();
    }
  }, [token]);

  const toggle = useCallback(
    (productId: string) => {
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(productId)) {
          next.delete(productId);
          trackWishlist(productId, "remove");
        } else {
          next.add(productId);
          trackWishlist(productId, "add");
        }
        persist(next);
        if (prevToken.current) {
          saveServerWishlist(prevToken.current, [...next]);
        }
        return next;
      });
    },
    [persist]
  );

  const isWishlisted = useCallback(
    (productId: string) => ids.has(productId),
    [ids]
  );

  return (
    <WishlistContext.Provider value={{ ids, toggle, isWishlisted, count: ids.size }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
