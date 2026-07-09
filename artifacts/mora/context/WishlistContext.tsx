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

const WISHLIST_KEY = "mora_wishlist_v1";

type WishlistContextValue = {
  ids: Set<string>;
  toggle: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  count: number;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const didLoad = useRef(false);

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
