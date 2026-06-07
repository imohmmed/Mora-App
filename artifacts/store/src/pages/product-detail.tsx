import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProduct, fetchProducts } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { ProductCard } from "@/components/ui/ProductCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronDown, ZoomIn, X, Ruler } from "lucide-react";
import { toast } from "sonner";

function AccordionItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-4 text-sm font-bold uppercase tracking-wider text-left"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

function SizeGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background max-w-lg w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold tracking-tighter uppercase mb-6 flex items-center gap-2">
          <Ruler className="h-5 w-5" /> Size Guide
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary">
                <th className="py-2 px-3 text-left font-bold uppercase tracking-wide text-xs">Size</th>
                <th className="py-2 px-3 text-left font-bold uppercase tracking-wide text-xs">Chest (cm)</th>
                <th className="py-2 px-3 text-left font-bold uppercase tracking-wide text-xs">Waist (cm)</th>
                <th className="py-2 px-3 text-left font-bold uppercase tracking-wide text-xs">Hip (cm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { size: "XS", chest: "80–84", waist: "62–66", hip: "88–92" },
                { size: "S", chest: "84–88", waist: "66–70", hip: "92–96" },
                { size: "M", chest: "88–92", waist: "70–74", hip: "96–100" },
                { size: "L", chest: "92–96", waist: "74–78", hip: "100–104" },
                { size: "XL", chest: "96–100", waist: "78–82", hip: "104–108" },
                { size: "XXL", chest: "100–106", waist: "82–88", hip: "108–114" },
              ].map((row) => (
                <tr key={row.size} className="hover:bg-secondary/50">
                  <td className="py-2 px-3 font-bold">{row.size}</td>
                  <td className="py-2 px-3 text-muted-foreground">{row.chest}</td>
                  <td className="py-2 px-3 text-muted-foreground">{row.waist}</td>
                  <td className="py-2 px-3 text-muted-foreground">{row.hip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          All measurements are in centimeters. If you're between sizes, we recommend sizing up.
        </p>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const params = useParams();
  const id = params.id as string;
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
  });

  const product = data?.product;

  React.useEffect(() => {
    if (product) {
      if (!selectedVariantId && product.variants.length > 0) {
        setSelectedVariantId(product.variants[0].id);
      }
      if (!selectedImage && product.images.length > 0) {
        setSelectedImage(product.images[0]);
      }
    }
  }, [product, selectedVariantId, selectedImage]);

  const { data: relatedData } = useQuery({
    queryKey: ["products", "related", product?.category],
    queryFn: () => fetchProducts({ category: product?.category, limit: 6 }),
    enabled: !!product?.category,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 grid md:grid-cols-2 gap-12">
          <div className="aspect-[3/4] bg-secondary animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-secondary animate-pulse w-2/3" />
            <div className="h-6 bg-secondary animate-pulse w-1/3" />
            <div className="h-24 bg-secondary animate-pulse w-full mt-8" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <Button asChild>
            <Link href="/products">Back to Shop</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) ||
    product.variants[0];

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      title: product.title,
      image: product.images[0] || "",
      price: selectedVariant.price,
      quantity,
      option1: selectedVariant.option1,
      option2: selectedVariant.option2,
    });
    toast.success(`${product.title} added to cart`, {
      description: `Size: ${selectedVariant.option1} · Qty: ${quantity}`,
    });
  };

  const handleWishlist = () => {
    toggle(product.id);
    toast(has(product.id) ? "Removed from wishlist" : "Saved to wishlist");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8 uppercase tracking-wide">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
          <span>/</span>
          <Link href={`/products?category=${product.category}`} className="hover:text-primary transition-colors capitalize">
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.title}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="flex flex-col gap-4">
            <motion.div
              className="relative aspect-[3/4] bg-secondary overflow-hidden cursor-zoom-in"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setZoomedImage(selectedImage)}
            >
              <img
                src={selectedImage}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm p-2 opacity-0 hover:opacity-100 transition-opacity">
                <ZoomIn className="h-4 w-4" />
              </div>
            </motion.div>
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 aspect-[3/4] flex-shrink-0 bg-secondary overflow-hidden border-2 transition-colors ${
                      selectedImage === img
                        ? "border-primary"
                        : "border-transparent hover:border-muted"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`View ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="mb-6">
              <Link
                href={`/products?category=${product.category}`}
                className="text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mb-2 block capitalize"
              >
                {product.category}
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
                {product.title}
              </h1>
              <div className="flex items-center gap-4 text-xl">
                <span className="font-bold">
                  ${selectedVariant?.price.toFixed(2)}
                </span>
                {product.comparePrice &&
                  product.comparePrice > (selectedVariant?.price || 0) && (
                    <span className="text-muted-foreground line-through text-base">
                      ${product.comparePrice.toFixed(2)}
                    </span>
                  )}
              </div>
            </div>

            {product.variants.length > 0 && (
              <div className="space-y-6 mb-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold uppercase tracking-wider">
                      Size:{" "}
                      <span className="text-primary">{selectedVariant?.option1}</span>
                    </label>
                    <button
                      onClick={() => setShowSizeGuide(true)}
                      className="text-xs text-primary underline flex items-center gap-1"
                    >
                      <Ruler className="h-3 w-3" /> Size Guide
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        disabled={v.inventory <= 0}
                        className={`w-12 h-12 border text-sm font-bold transition-colors
                          ${
                            selectedVariantId === v.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : v.inventory <= 0
                              ? "border-border text-muted-foreground line-through cursor-not-allowed"
                              : "border-border hover:border-foreground"
                          }`}
                      >
                        {v.option1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mb-6">
              <div className="flex items-center border border-input w-32 justify-between">
                <button
                  className="w-10 h-12 flex items-center justify-center hover:bg-secondary transition-colors"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  −
                </button>
                <span className="text-sm font-medium">{quantity}</span>
                <button
                  className="w-10 h-12 flex items-center justify-center hover:bg-secondary transition-colors"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
              <Button
                onClick={handleAddToCart}
                className="flex-1 h-12 text-base uppercase tracking-wider font-bold"
                disabled={
                  !selectedVariant || selectedVariant.inventory <= 0
                }
              >
                {selectedVariant?.inventory <= 0
                  ? "Out of Stock"
                  : "Add to Cart"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 flex-shrink-0"
                onClick={handleWishlist}
                title={has(product.id) ? "Remove from wishlist" : "Save to wishlist"}
              >
                <Heart
                  className={`h-5 w-5 ${
                    has(product.id)
                      ? "fill-primary text-primary"
                      : "text-foreground"
                  }`}
                />
              </Button>
            </div>

            <div className="space-y-0 border-b border-border">
              <AccordionItem title="Description">
                <p>{product.description}</p>
              </AccordionItem>
              <AccordionItem title="Care Instructions">
                <ul className="space-y-1">
                  <li>Machine wash cold at 30°C</li>
                  <li>Do not bleach</li>
                  <li>Tumble dry low</li>
                  <li>Iron on low heat</li>
                  <li>Do not dry clean</li>
                </ul>
              </AccordionItem>
              <AccordionItem title="Shipping & Returns">
                <p>Free shipping on all orders. Standard delivery in 5–7 business days. Express options available at checkout. Returns accepted within 30 days of delivery in original condition.</p>
              </AccordionItem>
              <AccordionItem title="Details">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Brand</span>
                    <span>{product.vendor || "Mora Studio"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Category</span>
                    <span className="capitalize">{product.category}</span>
                  </div>
                  {product.tags?.length > 0 && (
                    <div className="flex justify-between">
                      <span>Tags</span>
                      <span>{product.tags.join(", ")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Stock</span>
                    <span className={selectedVariant?.inventory > 0 ? "text-green-600" : "text-destructive"}>
                      {selectedVariant?.inventory > 0 ? `${selectedVariant.inventory} available` : "Out of stock"}
                    </span>
                  </div>
                </div>
              </AccordionItem>
            </div>
          </div>
        </div>

        {relatedData?.products && relatedData.products.length > 1 && (
          <div className="mt-24">
            <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8 text-center">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedData.products
                .filter((p) => p.id !== product.id)
                .slice(0, 4)
                .map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
            </div>
          </div>
        )}
      </div>

      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white"
            onClick={() => setZoomedImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={zoomedImage}
            alt={product.title}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showSizeGuide && <SizeGuideModal onClose={() => setShowSizeGuide(false)} />}
    </Layout>
  );
}
