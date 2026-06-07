import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCollections } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";

export default function Collections() {
  const { data, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: fetchCollections,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold tracking-tighter uppercase text-center mb-16">Collections</h1>
        
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[16/9] bg-secondary animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {data?.collections.map((collection) => (
              <Link key={collection.id} href={`/collections/${collection.id}`} className="group relative aspect-[16/9] overflow-hidden bg-secondary block">
                {collection.image && (
                  <img src={collection.image} alt={collection.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                  <h2 className="text-3xl font-bold tracking-tighter uppercase mb-4">{collection.title}</h2>
                  <p className="text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-4 group-hover:translate-y-0">
                    {collection.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
