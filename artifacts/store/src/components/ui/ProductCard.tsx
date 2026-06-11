import React, { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Product } from "@/lib/types";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export function ProductCard({ product, showQuickAdd }: { product: Product; showQuickAdd?: boolean }) {
  const image = product.images?.[0] || "https://picsum.photos/400/600";
  const hoverImage = product.images?.[1] || image;
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();
  const [adding, setAdding] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    addItem({
      productId: product.id,
      variantId: `v_${product.id}_2`,
      title: product.title,
      image: image,
      price: product.price,
      quantity: 1,
      option1: "M",
    });
    toast.success(`${product.title} added to cart`);
    setTimeout(() => setAdding(false), 600);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
    toast(has(product.id) ? "Removed from wishlist" : "Added to wishlist");
  };

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary mb-4">
        <motion.img
          src={image}
          alt={product.title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
        />
        <motion.img
          src={hoverImage}
          alt={product.title}
          className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
        {product.comparePrice && product.comparePrice > product.price && (
          <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 uppercase">
            Sale
          </div>
        )}

        <button
          onClick={handleWishlist}
          className="absolute top-2 right-2 w-8 h-8 bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
          title={has(product.id) ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${has(product.id) ? "fill-primary text-primary" : "text-foreground"}`}
          />
        </button>

        {showQuickAdd && (
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleQuickAdd}
              disabled={adding}
              className="w-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-3 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              {adding ? "Added!" : "Quick Add — M"}
            </button>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{product.category}</div>
        <h3 className="font-medium text-sm line-clamp-1">{product.title}</h3>
        <div className="flex gap-2 items-center text-sm">
          <span className="font-bold">${product.price.toFixed(2)}</span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-destructive line-through text-xs">
              ${product.comparePrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
