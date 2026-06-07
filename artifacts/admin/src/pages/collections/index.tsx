import { useState } from "react";
import { useAdminListCollections } from "@workspace/api-client-react";
import { Link } from "wouter";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FolderTree, Plus, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

export default function Collections() {
  const { data: response, isLoading } = useAdminListCollections();

  const collections = response?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground mt-1">Group your products into collections.</p>
        </div>
        <Button data-testid="btn-add-collection">
          <Plus className="w-4 h-4 mr-2" />
          Create Collection
        </Button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : collections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FolderTree className="h-8 w-8 mb-2 opacity-50" />
                    <p>No collections found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              collections.map((collection) => (
                <TableRow key={collection.id} className="cursor-pointer group relative">
                  <TableCell>
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {collection.image ? (
                        <img src={collection.image} alt={collection.title} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {collection.title}
                    {collection.description && (
                      <p className="text-xs text-muted-foreground font-normal line-clamp-1 mt-1">
                        {collection.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {collection.productsCount ?? 0} products
                  </TableCell>
                  <TableCell>
                    {collection.createdAt ? format(new Date(collection.createdAt), "MMM d, yyyy") : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}