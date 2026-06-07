import React, { useState } from "react";
import { Link } from "wouter";
import { ShoppingCart, Search, User, Menu, X, Heart, ChevronDown } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { Button } from "@/components/ui/button";

const MEGA_MENU = [
  {
    label: "Women",
    href: "/products?category=women",
    children: [
      { label: "New Arrivals", href: "/products?category=women" },
      { label: "Tops & Blouses", href: "/products?category=women" },
      { label: "Dresses", href: "/products?category=women" },
      { label: "Blazers", href: "/products?category=women" },
    ],
  },
  {
    label: "Men",
    href: "/products?category=men",
    children: [
      { label: "New Arrivals", href: "/products?category=men" },
      { label: "Shirts", href: "/products?category=men" },
      { label: "Trousers", href: "/products?category=men" },
      { label: "Jackets", href: "/products?category=men" },
    ],
  },
  {
    label: "Accessories",
    href: "/products?category=accessories",
    children: [
      { label: "Bags", href: "/products?category=accessories" },
      { label: "Jewelry", href: "/products?category=accessories" },
      { label: "Belts", href: "/products?category=accessories" },
    ],
  },
  {
    label: "Beauty",
    href: "/products?category=beauty",
    children: [
      { label: "Skincare", href: "/products?category=beauty" },
      { label: "Makeup", href: "/products?category=beauty" },
      { label: "Fragrance", href: "/products?category=beauty" },
    ],
  },
  {
    label: "Collections",
    href: "/collections",
    children: [],
  },
];

export function Navbar() {
  const { itemCount, setIsDrawerOpen } = useCart();
  const { items: wishlistItems } = useWishlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <Link href="/" className="font-bold text-2xl tracking-tighter text-primary">
            MORA
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          {MEGA_MENU.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => setActiveMenu(item.label)}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <Link
                href={item.href}
                className="flex items-center gap-1 px-4 py-5 text-sm font-medium hover:text-primary transition-colors uppercase tracking-wide"
              >
                {item.label}
                {item.children.length > 0 && (
                  <ChevronDown className={`h-3 w-3 transition-transform ${activeMenu === item.label ? "rotate-180" : ""}`} />
                )}
              </Link>

              {item.children.length > 0 && activeMenu === item.label && (
                <div className="absolute top-full left-0 mt-0 w-48 bg-background border border-border shadow-xl py-2 z-50">
                  {item.children.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      className="block px-4 py-2 text-sm hover:bg-secondary hover:text-primary transition-colors"
                      onClick={() => setActiveMenu(null)}
                    >
                      {child.label}
                    </Link>
                  ))}
                  <div className="border-t border-border mt-2 pt-2 px-4">
                    <Link
                      href={item.href}
                      className="text-xs font-bold text-primary uppercase tracking-wider hover:underline"
                      onClick={() => setActiveMenu(null)}
                    >
                      View All {item.label}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/search" className="text-foreground hover:text-primary transition-colors p-1">
            <Search className="h-5 w-5" />
          </Link>
          <Link href="/account" className="text-foreground hover:text-primary transition-colors p-1">
            <User className="h-5 w-5" />
          </Link>
          <Link href="/wishlist" className="text-foreground hover:text-primary transition-colors p-1 relative">
            <Heart className="h-5 w-5" />
            {wishlistItems.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {wishlistItems.length}
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="text-foreground hover:text-primary transition-colors relative p-1"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background lg:hidden flex flex-col">
          <div className="p-4 flex justify-between items-center border-b">
            <span className="font-bold text-xl text-primary">MORA</span>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <nav className="flex flex-col overflow-y-auto p-4 flex-1">
            {MEGA_MENU.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between border-b border-border py-3">
                  <Link
                    href={item.href}
                    className="text-lg font-medium uppercase tracking-wide"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {item.children.length > 0 && (
                    <button
                      onClick={() => setMobileExpanded((p) => (p === item.label ? null : item.label))}
                      className="p-1"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${mobileExpanded === item.label ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
                {item.children.length > 0 && mobileExpanded === item.label && (
                  <div className="pl-4 py-2 space-y-2">
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        className="block text-sm text-muted-foreground hover:text-primary py-1"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <Link href="/account" className="flex items-center gap-3 text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                <User className="h-4 w-4" /> My Account
              </Link>
              <Link href="/wishlist" className="flex items-center gap-3 text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                <Heart className="h-4 w-4" /> Wishlist {wishlistItems.length > 0 && `(${wishlistItems.length})`}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
