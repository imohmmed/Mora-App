import { useState } from "react";
import { useAdminListVariants, useAdminUpdateVariant } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Package, Save } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { formatIQD } from "@/lib/format";
import { useT } from "@/i18n/LanguageContext";

export default function Inventory() {
  const { t } = useT();
  const [editingQty, setEditingQty] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateVariant = useAdminUpdateVariant();

  const { data: response, isLoading } = useAdminListVariants();

  const allVariants = response?.data ?? [];
  const variants = search
    ? allVariants.filter(
        (v) =>
          v.title.toLowerCase().includes(search.toLowerCase()) ||
          v.sku.toLowerCase().includes(search.toLowerCase())
      )
    : allVariants;

  const handleSave = (variantId: string) => {
    const qty = parseInt(editingQty[variantId] ?? "0", 10);
    if (isNaN(qty)) return;
    updateVariant.mutate(
      { id: variantId, data: { inventory: qty } },
      {
        onSuccess: () => {
          toast({ title: t("products.toast.inventoryUpdated") });
          setEditingQty((prev) => {
            const next = { ...prev };
            delete next[variantId];
            return next;
          });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/variants"] });
        },
        onError: () =>
          toast({ title: t("toast.error"), description: t("products.toast.inventoryError"), variant: "destructive" }),
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("products.inventory.title")}
        subtitle={t("products.inventory.subtitle")}
      />

      <div className="flex items-center gap-3">
        <Input
          placeholder={t("products.inventory.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("products.col.variant")}</TableHead>
              <TableHead>{t("products.col.sku")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-end">{t("common.price")}</TableHead>
              <TableHead className="text-end">{t("products.col.currentStock")}</TableHead>
              <TableHead className="text-end w-40">{t("products.col.adjustQty")}</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">{t("common.loading")}</TableCell>
              </TableRow>
            ) : variants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-8 w-8 mb-2 opacity-50" />
                    <p>{t("products.inventory.empty")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              variants.map((v) => {
                const isEditing = editingQty[v.id] !== undefined;
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium">{v.title}</div>
                      {v.option1 && (
                        <div className="text-xs text-muted-foreground">{[v.option1, v.option2].filter(Boolean).join(" / ")}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{v.sku}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          v.inventory === 0 ? "destructive" : v.inventory < 5 ? "secondary" : "default"
                        }
                      >
                        {v.inventory === 0
                          ? t("products.stock.out")
                          : v.inventory < 5
                          ? t("products.stock.low")
                          : t("products.stock.in")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{formatIQD(v.price)}</TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">{v.inventory}</TableCell>
                    <TableCell className="text-end">
                      <Input
                        type="number"
                        className="h-8 w-24 ms-auto text-end"
                        value={isEditing ? editingQty[v.id] : v.inventory.toString()}
                        onChange={(e) =>
                          setEditingQty((prev) => ({ ...prev, [v.id]: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {isEditing && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleSave(v.id)}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
        ) : (
          variants.map((v) => {
            const isEditing = editingQty[v.id] !== undefined;
            return (
              <Card key={v.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{v.title}</p>
                      {v.option1 && (
                        <p className="text-xs text-muted-foreground">
                          {[v.option1, v.option2].filter(Boolean).join(" / ")}
                        </p>
                      )}
                      <p className="text-xs font-mono text-muted-foreground">{v.sku}</p>
                    </div>
                    <Badge
                      variant={
                        v.inventory === 0 ? "destructive" : v.inventory < 5 ? "secondary" : "default"
                      }
                    >
                      {v.inventory === 0 ? t("products.stock.out") : v.inventory < 5 ? t("products.stock.lowShort") : t("products.stock.in")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-8 flex-1"
                      value={isEditing ? editingQty[v.id] : v.inventory.toString()}
                      onChange={(e) =>
                        setEditingQty((prev) => ({ ...prev, [v.id]: e.target.value }))
                      }
                    />
                    {isEditing && (
                      <Button size="sm" onClick={() => handleSave(v.id)}>
                        <Save className="h-3.5 w-3.5 me-1" /> {t("action.save")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </PageContainer>
  );
}
