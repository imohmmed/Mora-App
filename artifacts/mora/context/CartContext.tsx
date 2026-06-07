import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CartItem } from "@/lib/types";

const CART_KEY = "mora_cart_v1";
const SESSION_KEY = "mora_cart_session_v1";

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : "/api";
}

function generateSessionId(): string {
  return "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function syncCartToApi(sessionId: string, items: CartItem[]): Promise<void> {
  try {
    const base = getApiBase();
    await fetch(`${base}/store/cart/${encodeURIComponent(sessionId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: items }),
    });
  } catch {
  }
}

async function fetchCartFromApi(sessionId: string): Promise<CartItem[] | null> {
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/store/cart/${encodeURIComponent(sessionId)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { data: { lines: CartItem[] } };
    return json.data?.lines ?? null;
  } catch {
    return null;
  }
}

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  sessionId: string;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQty: (productId: string, variantId: string, delta: number) => void;
  clearCart: () => void;
  isLoaded: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const didLoad = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;

    (async () => {
      let sid = await AsyncStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = generateSessionId();
        await AsyncStorage.setItem(SESSION_KEY, sid);
      }
      setSessionId(sid);

      const apiItems = await fetchCartFromApi(sid);
      if (apiItems && apiItems.length > 0) {
        setItems(apiItems);
        await AsyncStorage.setItem(CART_KEY, JSON.stringify(apiItems));
      } else {
        const raw = await AsyncStorage.getItem(CART_KEY);
        if (raw) {
          try {
            const local = JSON.parse(raw) as CartItem[];
            setItems(local);
            if (local.length > 0) {
              syncCartToApi(sid, local);
            }
          } catch {}
        }
      }
      setIsLoaded(true);
    })();
  }, []);

  const persist = useCallback((next: CartItem[], sid: string) => {
    AsyncStorage.setItem(CART_KEY, JSON.stringify(next)).catch(() => {});
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      if (sid) syncCartToApi(sid, next);
    }, 600);
  }, []);

  const addItem = useCallback(
    (item: CartItem) => {
      setItems((prev) => {
        const idx = prev.findIndex(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        );
        let next: CartItem[];
        if (idx >= 0) {
          next = prev.map((i, index) =>
            index === idx ? { ...i, quantity: i.quantity + item.quantity } : i
          );
        } else {
          next = [...prev, item];
        }
        persist(next, sessionId);
        return next;
      });
    },
    [persist, sessionId]
  );

  const removeItem = useCallback(
    (productId: string, variantId: string) => {
      setItems((prev) => {
        const next = prev.filter(
          (i) => !(i.productId === productId && i.variantId === variantId)
        );
        persist(next, sessionId);
        return next;
      });
    },
    [persist, sessionId]
  );

  const updateQty = useCallback(
    (productId: string, variantId: string, delta: number) => {
      setItems((prev) => {
        const next = prev
          .map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity: i.quantity + delta }
              : i
          )
          .filter((i) => i.quantity > 0);
        persist(next, sessionId);
        return next;
      });
    },
    [persist, sessionId]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    persist([], sessionId);
  }, [persist, sessionId]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, totalItems, subtotal, sessionId, addItem, removeItem, updateQty, clearCart, isLoaded }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
