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

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQty: (productId: string, variantId: string, delta: number) => void;
  clearCart: () => void;
  isLoaded: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const didLoad = useRef(false);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    AsyncStorage.getItem(CART_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setItems(JSON.parse(raw) as CartItem[]);
          } catch {}
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    AsyncStorage.setItem(CART_KEY, JSON.stringify(next)).catch(() => {});
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
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeItem = useCallback(
    (productId: string, variantId: string) => {
      setItems((prev) => {
        const next = prev.filter(
          (i) => !(i.productId === productId && i.variantId === variantId)
        );
        persist(next);
        return next;
      });
    },
    [persist]
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
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    persist([]);
  }, [persist]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, totalItems, subtotal, addItem, removeItem, updateQty, clearCart, isLoaded }}
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
