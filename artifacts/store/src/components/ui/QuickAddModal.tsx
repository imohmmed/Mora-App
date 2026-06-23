import React, { useEffect, useMemo, useRef, useState } from "react";
import { Product, Variant } from "@/lib/types";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const colorMap: Record<string, string> = {
  black: "#000000", white: "#FFFFFF", navy: "#1A2B6B",
  camel: "#C19A6B", grey: "#9E9E9E", gray: "#9E9E9E", red: "#D32F2F",
  green: "#388E3C", blue: "#0274C1", pink: "#E91E8C",
  beige: "#F5F0E8", brown: "#795548", orange: "#FF5722",
};

function clean(values: (string | undefined)[]): string[] {
  return Array.from(
    new Set(values.filter((v): v is string => !!v && v !== "Default Title"))
  );
}

export function QuickAddModal({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedColor(null);
    setSelectedSize(null);
    setActiveImg(0);
  }, [product?.id, open]);

  const variants = product?.variants ?? [];
  const colors = useMemo(() => clean(variants.map((v) => v.option2)), [variants]);
  const sizes = useMemo(() => clean(variants.map((v) => v.option1)), [variants]);
  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;

  const selectedVariant: Variant | null = useMemo(() => {
    if (hasColors && !selectedColor) return null;
    if (hasSizes && !selectedSize) return null;
    return (
      variants.find(
        (v) =>
          (!hasColors || v.option2 === selectedColor) &&
          (!hasSizes || v.option1 === selectedSize)
      ) ?? null
    );
  }, [variants, selectedColor, selectedSize, hasColors, hasSizes]);

  if (!product) return null;

  const images = (product.images ?? []).filter(Boolean);
  const liked = has(product.id);
  const optionsChosen =
    (!hasColors || !!selectedColor) && (!hasSizes || !!selectedSize);
  const inStock = !!selectedVariant && selectedVariant.inventory > 0;
  const canAdd = optionsChosen && inStock;

  const colorHasStock = (color: string) =>
    variants.some((v) => v.option2 === color && v.inventory > 0);
  const sizeHasStock = (size: string) =>
    variants.some(
      (v) =>
        v.option1 === size &&
        (!selectedColor || v.option2 === selectedColor) &&
        v.inventory > 0
    );

  const handleAdd = () => {
    const toAdd = selectedVariant;
    if (!toAdd || toAdd.inventory <= 0) return;
    addItem({
      productId: product.id,
      variantId: toAdd.id,
      title: product.title,
      image: images[0] || "",
      price: toAdd.price ?? product.price,
      quantity: 1,
      option1: toAdd.option1,
      option2: toAdd.option2,
    });
    onOpenChange(false);
  };

  const handleWishlist = () => {
    toggle(product.id);
    toast(liked ? "Removed from wishlist" : "Added to wishlist");
  };

  const onGalleryScroll = () => {
    const el = galleryRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeImg) setActiveImg(idx);
  };

  const btnLabel = (() => {
    if (hasColors && !selectedColor) return "Select Color";
    if (hasSizes && !selectedSize) return "Select Size";
    if (!inStock) return "Out of Stock";
    return "Add to Bag";
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-md overflow-hidden">
        <DialogTitle className="sr-only">{product.title}</DialogTitle>

        {/* ── Scrollable image gallery ── */}
        <div className="relative bg-secondary">
          <div
            ref={galleryRef}
            onScroll={onGalleryScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            {images.length > 0 ? (
              images.map((uri, i) => (
                <img
                  key={`${uri}-${i}`}
                  src={uri}
                  alt={product.title}
                  className="w-full flex-shrink-0 snap-center aspect-[4/5] object-cover"
                />
              ))
            ) : (
              <div className="w-full aspect-[4/5] flex items-center justify-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeImg ? "w-4 bg-white" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Details ── */}
        <div className="p-5">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {product.vendor ?? product.category ?? "Mora"}
          </div>
          <h3 className="font-bold text-lg leading-snug line-clamp-2">
            {product.title}
          </h3>
          <div className="text-lg font-bold text-primary mt-1">
            {Math.round(product.price).toLocaleString()} IQD
          </div>

          {/* Color chips */}
          {hasColors && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {selectedColor ? `Color — ${selectedColor}` : "Select Color"}
              </div>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const hex = colorMap[color.toLowerCase()] ?? "#CCCCCC";
                  const isSelected = selectedColor === color;
                  const stock = colorHasStock(color);
                  return (
                    <button
                      key={color}
                      title={color}
                      aria-label={`Color ${color}${!stock ? " (out of stock)" : ""}`}
                      aria-pressed={isSelected}
                      disabled={!stock}
                      onClick={() => {
                        setSelectedColor(color);
                        setSelectedSize(null);
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        isSelected
                          ? "border-primary scale-110 shadow-md"
                          : "border-transparent hover:border-muted-foreground"
                      } ${!stock ? "opacity-40 cursor-not-allowed" : ""}`}
                      style={{ backgroundColor: hex }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Size chips */}
          {hasSizes && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {selectedSize ? `Size — ${selectedSize}` : "Select Size"}
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const isSelected = selectedSize === size;
                  const stock = sizeHasStock(size);
                  return (
                    <button
                      key={size}
                      aria-label={`Size ${size}${!stock ? " (out of stock)" : ""}`}
                      aria-pressed={isSelected}
                      disabled={!stock}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-12 h-12 px-3 border text-sm font-bold transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : !stock
                          ? "border-border text-muted-foreground line-through cursor-not-allowed"
                          : "border-border hover:border-foreground"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Action row: Add to Bag + Favorite ── */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className="flex-1 h-12 bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-full transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="h-4 w-4" />
              {btnLabel}
            </button>
            <button
              onClick={handleWishlist}
              title={liked ? "Remove from wishlist" : "Add to wishlist"}
              className={`w-12 h-12 flex-shrink-0 rounded-full border flex items-center justify-center transition-colors ${
                liked ? "border-primary" : "border-border hover:border-foreground"
              }`}
            >
              <Heart
                className={`h-5 w-5 transition-colors ${
                  liked ? "fill-primary text-primary" : "text-foreground"
                }`}
              />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
