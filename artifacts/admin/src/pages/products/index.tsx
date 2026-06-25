import { useState } from "react";
import { useAdminListProducts } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, PackageOpen } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { formatIQD } from "@/lib/format";
import { useT } from "@/i18n/LanguageContext";

export default function Products() {
  const { t } = useT();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const debouncedSearch = useDebounce(search, 300);

  const { data: response, isLoading } = useAdminListProducts({
    q: debouncedSearch || undefined,
    status: status !== "all" ? status : undefined,
    category: category !== "all" ? category : undefined,
  });

  const products = response?.data ?? [];

  const statusLabel = (s: string) => {
    if (s === "active") return t("products.status.active");
    if (s === "draft") return t("products.status.draft");
    if (s === "archived") return t("products.status.archived");
    return s;
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("products.title")}
        subtitle={t("products.subtitle")}
        actions={
          <Button data-testid="btn-add-product" onClick={() => navigate("/products/new")}>
            <Plus className="w-4 h-4 me-2" />
            {t("products.add")}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-4 rounded-lg border">
        <div className="relative flex-1 w-full">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("products.search.placeholder")}
            className="ps-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("products.filter.allStatus")}</SelectItem>
              <SelectItem value="active">{t("products.status.active")}</SelectItem>
              <SelectItem value="draft">{t("products.status.draft")}</SelectItem>
              <SelectItem value="archived">{t("products.status.archived")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder={t("products.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("products.filter.allCategories")}</SelectItem>
              <SelectItem value="clothing">{t("products.category.clothing")}</SelectItem>
              <SelectItem value="accessories">{t("products.category.accessories")}</SelectItem>
              <SelectItem value="shoes">{t("products.category.shoes")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[72px]">{t("products.col.image")}</TableHead>
              <TableHead>{t("products.col.product")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("products.col.inventory")}</TableHead>
              <TableHead>{t("products.category")}</TableHead>
              <TableHead className="text-end">{t("common.price")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">{t("common.loading")}</TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <PackageOpen className="h-8 w-8 mb-2 opacity-50" />
                    <p>{t("products.empty")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id} className="cursor-pointer group relative">
                  <TableCell>
                    <div className="h-11 w-11 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <PackageOpen className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/products/${product.id}`} className="absolute inset-0">
                      <span className="sr-only">{t("products.viewProduct", { title: product.title })}</span>
                    </Link>
                    {product.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === "active" ? "default" : "secondary"}>
                      {statusLabel(product.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={product.totalInventory === 0 ? "text-destructive font-medium" : ""}>
                      {t("products.inStock", { n: product.totalInventory ?? 0 })}
                    </span>
                    <div className="text-xs text-muted-foreground">{t("products.variantsCount", { n: product.variantsCount })}</div>
                  </TableCell>
                  <TableCell className="capitalize">{product.category}</TableCell>
                  <TableCell className="text-end font-medium tabular-nums">{formatIQD(product.price)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <PackageOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{t("products.empty")}</p>
          </div>
        ) : (
          products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="cursor-pointer hover:shadow-sm transition-shadow active:opacity-80">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <PackageOpen className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.title}</p>
                      <p className="text-sm text-muted-foreground capitalize">{product.category}</p>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <p className="font-semibold tabular-nums">{formatIQD(product.price)}</p>
                      <Badge variant={product.status === "active" ? "default" : "secondary"} className="text-xs">
                        {statusLabel(product.status)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </PageContainer>
  );
}
