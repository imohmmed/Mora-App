import React from "react";
import { Link } from "wouter";
import { ShoppingCart, Search, User, Menu, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { itemCount, setIsDrawerOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { name: "New Arrivals", href: "/products" },
    { name: "Women", href: "/products?category=women" },
    { name: "Men", href: "/products?category=men" },
    { name: "Accessories", href: "/products?category=accessories" },
    { name: "Collections", href: "/collections" },
  ];

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

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-medium hover:text-primary transition-colors uppercase tracking-wide"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/search" className="text-foreground hover:text-primary transition-colors">
            <Search className="h-5 w-5" />
          </Link>
          <Link href="/account" className="text-foreground hover:text-primary transition-colors">
            <User className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="text-foreground hover:text-primary transition-colors relative"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
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
          <nav className="flex flex-col p-4 gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-lg font-medium border-b pb-4 uppercase"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
