import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchBlogPosts, fetchCollections } from "@/lib/api";
import { ProductCard } from "@/components/ui/ProductCard";
import { Layout } from "@/components/layout/Layout";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2071&auto=format&fit=crop",
    title: "The Fall Collection",
    subtitle: "Minimalism meets warmth.",
    cta: "Shop Women",
    href: "/products?category=women",
  },
  {
    image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070&auto=format&fit=crop",
    title: "New In",
    subtitle: "Fresh arrivals every week.",
    cta: "Explore New",
    href: "/products",
  },
  {
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop",
    title: "Year-End Sale",
    subtitle: "Up to 40% off selected styles.",
    cta: "Shop Sale",
    href: "/products",
  },
];

const CATEGORIES = [
  { name: "Women", slug: "women", image: "https://images.unsplash.com/photo-1434389678232-05f3cc4a85fa?q=80&w=1968&auto=format&fit=crop" },
  { name: "Men", slug: "men", image: "https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?q=80&w=2070&auto=format&fit=crop" },
  { name: "Beauty", slug: "beauty", image: "https://images.unsplash.com/photo-1596462502278-27bf85033e5a?q=80&w=2071&auto=format&fit=crop" },
  { name: "Sale", slug: "sale", image: "https://images.unsplash.com/photo-1607082349566-187342175e2f?q=80&w=2070&auto=format&fit=crop" },
  { name: "New In", slug: "new", image: "https://images.unsplash.com/photo-1509319117193-57bab727e09d?q=80&w=1974&auto=format&fit=crop" },
];

function Hero() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", () => setCurrent(emblaApi.selectedScrollSnap()));
    const id = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(id);
  }, [emblaApi]);

  return (
    <div className="relative overflow-hidden w-full h-[75vh]" ref={emblaRef}>
      <div className="flex h-full">
        {HERO_SLIDES.map((slide, i) => (
          <div key={i} className="flex-[0_0_100%] min-w-0 relative">
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col items-center justify-center text-white p-4">
              <motion.h1
                key={`${i}-title`}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 text-center"
              >
                {slide.title}
              </motion.h1>
              <motion.p
                key={`${i}-sub`}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-xl md:text-2xl mb-8 text-center text-white/90"
              >
                {slide.subtitle}
              </motion.p>
              <motion.div
                key={`${i}-cta`}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <Button size="lg" asChild className="bg-white text-black hover:bg-white/90 uppercase font-bold tracking-wider">
                  <Link href={slide.href}>{slide.cta}</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-white w-6" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

function PromoBanner() {
  return (
    <section className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-6">
          <span>🚚 Free Shipping on orders over $50</span>
          <span className="hidden sm:block">|</span>
          <span className="hidden sm:block">🎁 New arrivals every Friday</span>
        </div>
        <Link href="/products" className="font-bold underline hover:no-underline flex items-center gap-1">
          Shop Sale <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function CategoryGrid() {
  return (
    <section className="py-16 container mx-auto px-4">
      <h2 className="text-3xl font-bold tracking-tighter uppercase mb-8 text-center">Shop by Category</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => (
          <Link key={cat.slug} href={`/products?category=${cat.slug}`} className="group relative aspect-[3/4] overflow-hidden">
            <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/20 transition-colors duration-500 group-hover:bg-black/40" />
            <div className="absolute inset-0 flex items-end p-4">
              <h3 className="text-white text-lg font-bold tracking-tighter uppercase">{cat.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { data: trendingData, isLoading: loadingTrending } = useQuery({
    queryKey: ["products", "trending"],
    queryFn: () => fetchProducts({ limit: 8 }),
  });

  const { data: newData, isLoading: loadingNew } = useQuery({
    queryKey: ["products", "new"],
    queryFn: () => fetchProducts({ limit: 4 }),
  });

  const { data: collectionsData } = useQuery({
    queryKey: ["collections"],
    queryFn: fetchCollections,
  });

  const { data: blogData } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: fetchBlogPosts,
  });

  const trending = (trendingData?.products ?? []).slice(0, 4);
  const newArrivals = (newData?.products ?? []).slice(4, 8);
  const collections = collectionsData?.collections ?? [];

  return (
    <Layout>
      <Hero />
      <PromoBanner />
      <CategoryGrid />

      {/* Trending / Featured Products */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-bold tracking-tighter uppercase">Trending Now</h2>
          <Link href="/products" className="text-sm font-bold uppercase hover:text-primary transition-colors flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loadingTrending ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="aspect-[3/4] bg-secondary animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trending.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Promo band */}
      <section className="py-20 bg-foreground text-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-4">Year-End Sale</h2>
          <p className="text-lg text-background/70 mb-8">Up to 40% off on selected styles. Limited time only.</p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 uppercase font-bold tracking-wider">
            <Link href="/products">Shop Sale Now</Link>
          </Button>
        </div>
      </section>

      {/* New In */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-bold tracking-tighter uppercase">New In</h2>
          <Link href="/products" className="text-sm font-bold uppercase hover:text-primary transition-colors flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loadingNew ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="aspect-[3/4] bg-secondary animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {(trendingData?.products ?? []).slice(4, 8).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Featured Collections */}
      {collections.length > 0 && (
        <section className="py-16 bg-secondary">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold tracking-tighter uppercase mb-8 text-center">Featured Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.slice(0, 3).map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  className="group relative aspect-[4/3] overflow-hidden bg-background"
                >
                  <div className="absolute inset-0 bg-secondary flex items-center justify-center">
                    <span className="text-2xl font-bold text-muted-foreground uppercase">{col.title}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                    <h3 className="text-white text-xl font-bold tracking-tighter">{col.title}</h3>
                    {col.description && (
                      <p className="text-white/70 text-sm mt-1 line-clamp-1">{col.description}</p>
                    )}
                    <span className="inline-flex items-center gap-1 text-white text-xs font-bold uppercase tracking-wider mt-2 group-hover:gap-2 transition-all">
                      Shop Collection <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button variant="outline" asChild>
                <Link href="/collections">View All Collections</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Blog / Journal */}
      {blogData?.posts && blogData.posts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold tracking-tighter uppercase mb-8 text-center">The Journal</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogData.posts.slice(0, 3).map((post) => (
                <Link key={post.id} href={`/blog/${post.id}`} className="group block">
                  <div className="aspect-[4/3] bg-secondary mb-4 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                      {post.title}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{post.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-2">{post.excerpt}</p>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Button variant="outline" asChild>
                <Link href="/blog">Read The Journal</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
