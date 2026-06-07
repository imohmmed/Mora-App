import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBlogPosts } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";

export default function Blog() {
  const { data, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: fetchBlogPosts,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tighter uppercase text-center mb-16">The Journal</h1>

        {isLoading ? (
          <div className="space-y-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[21/9] bg-secondary mb-6" />
                <div className="h-8 bg-secondary w-2/3 mb-4" />
                <div className="h-4 bg-secondary w-full mb-2" />
                <div className="h-4 bg-secondary w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-24">
            {data?.posts.map((post) => (
              <article key={post.id} className="group">
                <Link href={`/blog/${post.id}`}>
                  <div className="aspect-[21/9] bg-secondary mb-8 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground transition-transform duration-700 group-hover:scale-105">
                      Journal Visual
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{post.author}</span>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tighter mb-4 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    {post.excerpt}
                  </p>
                  <span className="text-sm font-bold uppercase tracking-wider border-b-2 border-transparent group-hover:border-primary transition-colors text-primary pb-1">
                    Read Story
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
