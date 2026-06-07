import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchBlogPosts } from "@/lib/api";
import { ProductCard } from "@/components/ui/ProductCard";
import { Layout } from "@/components/layout/Layout";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

function Hero() {
  const [emblaRef] = useEmblaCarousel({ loop: true });

  const slides = [
    {
      image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2071&auto=format&fit=crop",
      title: "The Fall Collection",
      subtitle: "Minimalism meets warmth.",
    },
    {
      image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070&auto=format&fit=crop",
      title: "Essentials",
      subtitle: "Elevate your everyday.",
    },
  ];

  return (
    <div className="relative overflow-hidden w-full h-[70vh]" ref={emblaRef}>
      <div className="flex h-full">
        {slides.map((slide, index) => (
          <div key={index} className="flex-[0_0_100%] min-w-0 relative">
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center text-white p-4">
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 text-center"
              >
                {slide.title}
              </motion.h1>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl md:text-2xl mb-8 text-center"
              >
                {slide.subtitle}
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button size="lg" asChild className="bg-white text-black hover:bg-white/90">
                  <Link href="/products">Shop Now</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryGrid() {
  const categories = [
    { name: "Women", slug: "women", image: "https://images.unsplash.com/photo-1434389678232-05f3cc4a85fa?q=80&w=1968&auto=format&fit=crop" },
    { name: "Men", slug: "men", image: "https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?q=80&w=2070&auto=format&fit=crop" },
    { name: "Accessories", slug: "accessories", image: "https://images.unsplash.com/photo-1509319117193-57bab727e09d?q=80&w=1974&auto=format&fit=crop" },
    { name: "Beauty", slug: "beauty", image: "https://images.unsplash.com/photo-1596462502278-27bf85033e5a?q=80&w=2071&auto=format&fit=crop" },
  ];

  return (
    <section className="py-16 container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Link key={cat.slug} href={`/products?category=${cat.slug}`} className="group relative aspect-[3/4] overflow-hidden">
            <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/10 transition-colors duration-500 group-hover:bg-black/30" />
            <div className="absolute bottom-6 left-6">
              <h3 className="text-white text-2xl font-bold tracking-tighter uppercase">{cat.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "trending"],
    queryFn: () => fetchProducts({ limit: 4 }),
  });

  const { data: blogData } = useQuery({
    queryKey: ["blog-posts", "featured"],
    queryFn: fetchBlogPosts,
  });

  return (
    <Layout>
      <Hero />
      <CategoryGrid />

      <section className="py-16 container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-bold tracking-tighter uppercase">Trending Now</h2>
          <Link href="/products" className="text-sm font-bold uppercase hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary">
            View All
          </Link>
        </div>
        
        {isLoadingProducts ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="aspect-[3/4] bg-secondary animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {productsData?.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {blogData?.posts && blogData.posts.length > 0 && (
        <section className="py-16 bg-secondary">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold tracking-tighter uppercase mb-8 text-center">The Journal</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogData.posts.slice(0, 3).map((post) => (
                <Link key={post.id} href={`/blog/${post.id}`} className="group block">
                  <div className="aspect-[4/3] bg-background mb-4 overflow-hidden">
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground transition-transform duration-500 group-hover:scale-105">
                      Journal Entry
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{post.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-2">{post.excerpt}</p>
                </Link>
              ))}
            </div>
            <div className="text-center mt-12">
              <Button variant="outline" asChild>
                <Link href="/blog">Read More</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
