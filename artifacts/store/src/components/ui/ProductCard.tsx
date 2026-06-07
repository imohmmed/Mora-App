import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0] || "https://picsum.photos/400/600";
  const hoverImage = product.images?.[1] || image;

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
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-sm line-clamp-1">{product.title}</h3>
        <div className="flex gap-2 items-center text-sm">
          <span className="font-bold">${product.price.toFixed(2)}</span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-muted-foreground line-through text-xs">
              ${product.comparePrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
