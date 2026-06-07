import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProduct, fetchProducts } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { ProductCard } from "@/components/ui/ProductCard";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { motion } from "framer-motion";

export default function ProductDetail() {
  const params = useParams();
  const id = params.id as string;
  const { addItem } = useCart();

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>("");

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
    queryFn: () => fetchProducts({ category: product?.category, limit: 4 }),
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
          <Button asChild><Link href="/products">Back to Shop</Link></Button>
        </div>
      </Layout>
    );
  }

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

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
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Images */}
          <div className="flex flex-col gap-4">
            <motion.div 
              className="aspect-[3/4] bg-secondary overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <img src={selectedImage} alt={product.title} className="w-full h-full object-cover" />
            </motion.div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.images.map((img, i) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 aspect-[3/4] flex-shrink-0 bg-secondary overflow-hidden border-2 ${selectedImage === img ? 'border-primary' : 'border-transparent'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <div className="mb-8">
              <Link href={`/products?category=${product.category}`} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mb-2 block">
                {product.category}
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">{product.title}</h1>
              <div className="flex items-center gap-4 text-xl">
                <span className="font-bold">${selectedVariant?.price.toFixed(2)}</span>
                {product.comparePrice && product.comparePrice > (selectedVariant?.price || 0) && (
                  <span className="text-muted-foreground line-through text-base">
                    ${product.comparePrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {product.variants.length > 1 && (
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-sm font-bold uppercase tracking-wider mb-2 block">Variant</label>
                  <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {product.variants.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex gap-4 mb-12">
              <div className="flex items-center border border-input w-32 justify-between">
                <button 
                  className="w-10 h-12 flex items-center justify-center hover:bg-secondary transition-colors"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
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
                disabled={!selectedVariant || selectedVariant.inventory <= 0}
              >
                {selectedVariant?.inventory <= 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
            </div>

            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>{product.description}</p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedData?.products && relatedData.products.length > 0 && (
          <div className="mt-24">
            <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8 text-center">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedData.products.filter(p => p.id !== product.id).slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
