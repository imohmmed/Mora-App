import React from "react";
import { Link } from "wouter";
import { Instagram, Twitter, Facebook } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="bg-secondary mt-auto border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-xl tracking-tighter text-primary mb-4">MORA</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Modern lifestyle and fashion for the everyday minimalist. Quality over quantity.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <Instagram className="h-5 w-5 hover:text-foreground cursor-pointer transition-colors" />
              <Twitter className="h-5 w-5 hover:text-foreground cursor-pointer transition-colors" />
              <Facebook className="h-5 w-5 hover:text-foreground cursor-pointer transition-colors" />
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 uppercase text-sm tracking-wider">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products?category=women" className="hover:text-foreground transition-colors">Women</Link></li>
              <li><Link href="/products?category=men" className="hover:text-foreground transition-colors">Men</Link></li>
              <li><Link href="/products?category=accessories" className="hover:text-foreground transition-colors">Accessories</Link></li>
              <li><Link href="/collections" className="hover:text-foreground transition-colors">Collections</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 uppercase text-sm tracking-wider">Help</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/account" className="hover:text-foreground transition-colors">Track Order</Link></li>
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Returns</span></li>
              <li><span className="hover:text-foreground transition-colors cursor-pointer">FAQ</span></li>
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Contact Us</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 uppercase text-sm tracking-wider">Newsletter</h4>
            <p className="text-muted-foreground text-sm mb-4">
              Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
            </p>
            <div className="flex gap-2">
              <Input placeholder="Enter your email" className="bg-background" />
              <Button>Subscribe</Button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border mt-12 pt-8 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Mora. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
