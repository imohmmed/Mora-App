import { useState, useEffect } from "react";
import { useAdminGetProduct, useAdminUpdateProduct, useAdminGetProductVariants } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Package } from "lucide-react";
import { cn } from "@/lib/utils";

type VariantRow = {
  id: string;
  title: string;
  sku: string;
  price: number;
  inventory: number;
};

export default function ProductDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: response, isLoading } = useAdminGetProduct(id!);
  const { data: variantsRes } = useAdminGetProductVariants(id!);
  const updateProduct = useAdminUpdateProduct();
  
  const product = response?.data;
  const apiVariants = (variantsRes?.data ?? product?.variants ?? []) as unknown as VariantRow[];
  
  const [formData, setFormData] = useState({
    title: "",
    vendor: "",
    category: "",
    description: "",
    price: "",
    status: "",
  });

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || "",
        vendor: product.vendor || "",
        category: product.category || "",
        description: product.description || "",
        price: product.price?.toString() || "",
        status: product.status || "draft",
      });
    }
  }, [product]);

  const handleSave = () => {
    if (!id) return;
    updateProduct.mutate(
      { 
        id, 
        data: { 
          title: formData.title,
          vendor: formData.vendor,
          category: formData.category,
          description: formData.description,
          price: parseFloat(formData.price) || 0,
          status: formData.status,
        } 
      },
      {
        onSuccess: () => {
          toast({ title: "Product updated", description: "Changes saved successfully." });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/products", id] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update product.", variant: "destructive" });
        }
      }
    );
  };

  // Derive option axes from variant titles (e.g. "Red / L" → color=Red, size=L)
  const variantMatrix = (() => {
    if (!apiVariants.length) return null;

    const splitTitles = apiVariants.map(v => {
      const parts = (v.title || "Default Title").split(" / ").map(s => s.trim());
      return parts;
    });

    const maxOptions = Math.max(...splitTitles.map(p => p.length));
    if (maxOptions < 2) return null; // single-option — plain table is fine

    // Axis 0 = rows, Axis 1 = columns
    const rowValues = [...new Set(splitTitles.map(p => p[0]))];
    const colValues = [...new Set(splitTitles.map(p => p[1] ?? ""))];

    const lookup: Record<string, VariantRow> = {};
    apiVariants.forEach((v, i) => {
      const parts = splitTitles[i];
      lookup[`${parts[0]}|${parts[1] ?? ""}`] = v;
    });

    return { rowValues, colValues, lookup };
  })();

  if (isLoading) {
    return <div className="p-6 md:p-8">Loading product details...</div>;
  }

  if (!product) {
    return <div className="p-6 md:p-8">Product not found.</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            {product.title}
            <Badge variant={product.status === "active" ? "default" : "secondary"}>
              {product.status}
            </Badge>
          </h1>
        </div>
        <Button onClick={handleSave} disabled={updateProduct.isPending} data-testid="btn-save-product">
          <Save className="w-4 h-4 mr-2" />
          {updateProduct.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  value={formData.title} 
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  rows={5}
                  value={formData.description} 
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Variant Matrix / Table */}
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>
                {apiVariants.length} variant{apiVariants.length !== 1 ? "s" : ""} — sizes and colors from inventory.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiVariants.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border rounded-md bg-muted/20">
                  This product has no variants.
                </div>
              ) : variantMatrix ? (
                /* Matrix view: rows = color, columns = size */
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground mb-2">
                    Showing {variantMatrix.rowValues.length} × {variantMatrix.colValues.length} variant matrix
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-muted/40">
                          <th className="text-left px-3 py-2 font-medium border-b border-r">Color / Size</th>
                          {variantMatrix.colValues.map(col => (
                            <th key={col} className="px-3 py-2 font-medium text-center border-b border-r last:border-r-0">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {variantMatrix.rowValues.map(row => (
                          <tr key={row} className="hover:bg-muted/20">
                            <td className="px-3 py-2 font-medium border-r text-muted-foreground">{row}</td>
                            {variantMatrix.colValues.map(col => {
                              const v = variantMatrix.lookup[`${row}|${col}`];
                              return (
                                <td key={col} className={cn("px-3 py-2 text-center border-r last:border-r-0", !v && "bg-muted/30")}>
                                  {v ? (
                                    <div className="space-y-0.5">
                                      <div className="font-semibold">${v.price.toFixed(2)}</div>
                                      <div className={cn("text-xs", v.inventory <= 0 ? "text-red-500" : "text-muted-foreground")}>
                                        {v.inventory} in stock
                                      </div>
                                      {v.sku && <div className="text-xs font-mono text-muted-foreground/60">{v.sku}</div>}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/40 text-xs">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Fallback plain table for single-option variants */
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-2 font-medium">Variant</th>
                        <th className="text-left px-4 py-2 font-medium">SKU</th>
                        <th className="text-right px-4 py-2 font-medium">Price</th>
                        <th className="text-right px-4 py-2 font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {apiVariants.map((v) => (
                        <tr key={v.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2 font-medium">{v.title}</td>
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{v.sku}</td>
                          <td className="px-4 py-2 text-right">${v.price.toFixed(2)}</td>
                          <td className={cn("px-4 py-2 text-right", v.inventory <= 0 ? "text-red-500 font-medium" : "")}>
                            {v.inventory}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input 
                  id="vendor" 
                  value={formData.vendor} 
                  onChange={e => setFormData(p => ({ ...p, vendor: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                    <SelectItem value="shoes">Shoes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Base Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    id="price" 
                    type="number"
                    className="pl-7"
                    value={formData.price} 
                    onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {product.images.map((img, i) => (
                    <div key={i} className="aspect-square rounded-md bg-muted overflow-hidden border">
                      <img src={img} alt={`Product image ${i+1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="aspect-square rounded-md bg-muted border border-dashed flex flex-col items-center justify-center text-muted-foreground">
                  <Package className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm">No images</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
