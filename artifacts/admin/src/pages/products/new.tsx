import { useState } from "react";
import { useAdminCreateProduct } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X } from "lucide-react";

export default function NewProduct() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createProduct = useAdminCreateProduct();

  const [form, setForm] = useState({
    title: "",
    vendor: "",
    category: "women",
    description: "",
    price: "",
    compareAtPrice: "",
    cost: "",
    status: "draft",
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");

  const fmtIQD = (n: number) => `${Math.round(n).toLocaleString("en-US")} IQD`;
  const priceNum = parseFloat(form.price) || 0;
  const costNum = parseFloat(form.cost) || 0;
  const profit = priceNum - costNum;
  const margin = priceNum > 0 ? (profit / priceNum) * 100 : 0;

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.price);
    if (!form.title || !form.vendor || isNaN(price)) {
      toast({ title: "Missing fields", description: "Title, vendor, and price are required.", variant: "destructive" });
      return;
    }
    createProduct.mutate(
      {
        data: {
          title: form.title,
          vendor: form.vendor,
          category: form.category,
          description: form.description,
          price,
          compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
          cost: form.cost ? parseFloat(form.cost) : null,
          status: form.status,
          tags: form.tags,
        },
      },
      {
        onSuccess: (res) => {
          toast({ title: "Product created" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
          navigate(`/products/${res.data?.id ?? ""}`);
        },
        onError: () =>
          toast({ title: "Error", description: "Failed to create product.", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column — main info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Classic Oxford Shirt"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Product description..."
                  rows={5}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Selling Price (IQD) *</Label>
                  <div className="relative">
                    <Input
                      id="price"
                      type="number"
                      step="1"
                      min="0"
                      className="pr-12"
                      placeholder="0"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">IQD</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="compareAtPrice">Compare-at Price (IQD)</Label>
                  <div className="relative">
                    <Input
                      id="compareAtPrice"
                      type="number"
                      step="1"
                      min="0"
                      className="pr-12"
                      placeholder="0"
                      value={form.compareAtPrice}
                      onChange={(e) => set("compareAtPrice", e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">IQD</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost">Cost per item (IQD)</Label>
                  <div className="relative">
                    <Input
                      id="cost"
                      type="number"
                      step="1"
                      min="0"
                      className="pr-12"
                      placeholder="0"
                      value={form.cost}
                      onChange={(e) => set("cost", e.target.value)}
                      data-testid="input-cost"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">IQD</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Set Compare-at above the selling price to show a discount in the store and app.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Profit</p>
                  <p className="text-sm font-semibold" data-testid="text-profit">
                    {form.cost ? fmtIQD(profit) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margin</p>
                  <p className="text-sm font-semibold" data-testid="text-margin">
                    {form.cost && priceNum > 0 ? `${margin.toFixed(1)}%` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Variants</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Variants can be added after the product is created.</p>
                <p>Save this product first, then add size/color variants from the product detail page.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1 pr-1">
                      {t}
                      <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — meta */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="women">Women</SelectItem>
                    <SelectItem value="men">Men</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                    <SelectItem value="new_in">New In</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor">Vendor *</Label>
                <Input
                  id="vendor"
                  placeholder="e.g. Mora Brand"
                  value={form.vendor}
                  onChange={(e) => set("vendor", e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button type="submit" disabled={createProduct.isPending} className="w-full">
              {createProduct.isPending ? "Saving..." : "Save Product"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/products")}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
