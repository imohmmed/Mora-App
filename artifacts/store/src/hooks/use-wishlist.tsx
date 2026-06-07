import React, { createContext, useContext, useState, useEffect } from "react";

type WishlistContextType = {
  items: string[];
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
};

const WishlistContext = createContext<WishlistContextType>({
  items: [],
  toggle: () => {},
  has: () => false,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("mora_wishlist") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("mora_wishlist", JSON.stringify(items));
  }, [items]);

  const toggle = (productId: string) => {
    setItems((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const has = (productId: string) => items.includes(productId);

  return (
    <WishlistContext.Provider value={{ items, toggle, has }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
