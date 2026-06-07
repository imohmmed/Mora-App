import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

export type CartItem = {
  productId: string;
  variantId: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
  option1?: string;
  option2?: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mora_cart");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mora_cart", JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const addItem = (item: CartItem) => {
    setItems((current) => {
      const existing = current.find((i) => i.variantId === item.variantId);
      if (existing) {
        return current.map((i) =>
          i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...current, item];
    });
    toast.success("Added to cart");
    setIsDrawerOpen(true);
  };

  const removeItem = (variantId: string) => {
    setItems((current) => current.filter((i) => i.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((current) =>
      current.map((i) => (i.variantId === variantId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        isDrawerOpen,
        setIsDrawerOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
