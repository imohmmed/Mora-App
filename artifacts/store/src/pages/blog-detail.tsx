import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBlogPosts } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function BlogDetail() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: fetchBlogPosts,
  });

  const post = data?.posts.find((p) => p.id === id || p.handle === id);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-3xl animate-pulse">
          <div className="h-12 bg-secondary w-3/4 mb-6 mx-auto" />
          <div className="h-4 bg-secondary w-1/4 mb-16 mx-auto" />
          <div className="aspect-[21/9] bg-secondary mb-12" />
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-4 bg-secondary w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
          <Button asChild><Link href="/blog">Back to Journal</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="container mx-auto px-4 py-16 max-w-3xl">
        <header className="text-center mb-16">
          <div className="flex justify-center items-center gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-6">
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>{post.author}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-8 leading-tight">
            {post.title}
          </h1>
        </header>

        <div className="aspect-[21/9] bg-secondary mb-16 flex items-center justify-center text-muted-foreground">
          Journal Visual
        </div>

        <div 
          className="prose prose-lg max-w-none text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {post.tags && post.tags.length > 0 && (
          <div className="mt-16 pt-8 border-t border-border">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <span key={tag} className="px-4 py-2 bg-secondary text-xs font-medium uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
    </Layout>
  );
}
