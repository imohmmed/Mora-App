import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAdminListOrders, useAdminDeleteOrder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input }    from "@/components/ui/input";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/page-primitives";
import {
  Search, Inbox, ChevronLeft, ChevronRight, ArrowUpDown, Trash2,
  Printer, CheckCircle2, Package, Truck, Home, AlertTriangle, XCircle, Bell,
  RotateCcw, PackageX, FileText, Thermometer,
} from "lucide-react";
import { fmt } from "@/lib/date";
import { formatIQD } from "@/lib/format";
import { printReceipts } from "@/lib/print-receipt";
import { adminFetch } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/i18n/LanguageContext";

const PAGE_SIZE = 20;

type StageFilter =
  | "all" | "confirmed" | "preparing" | "shipping" | "delivered" | "issue" | "cancelled"
  | "returned" | "partial_return" | "returned_no_restock";

const STAGE_TABS: { key: StageFilter; labelKey: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { key: "all",       labelKey: "common.all" },
  { key: "confirmed", labelKey: "orders.stage.confirmed", icon: CheckCircle2 },
  { key: "preparing", labelKey: "orders.stage.preparing", icon: Package },
  { key: "shipping",  labelKey: "orders.stage.shipping",  icon: Truck },
  { key: "delivered", labelKey: "orders.stage.delivered", icon: Home },
  { key: "issue",     labelKey: "orders.stage.issue",     icon: AlertTriangle },
  { key: "cancelled", labelKey: "orders.stage.cancelled", icon: XCircle },
  { key: "returned",            labelKey: "orders.stage.returned",            icon: RotateCcw },
  { key: "partial_return",      labelKey: "orders.stage.partial_return",      icon: RotateCcw },
  { key: "returned_no_restock", labelKey: "orders.stage.returned_no_restock", icon: PackageX },
];

// Return stages are terminal — item quantities matter, so they can't be set via bulk change
const BULK_EXCLUDED_STAGES = new Set<StageFilter>(["all", "returned", "partial_return", "returned_no_restock"]);

const STAGE_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  preparing: "bg-amber-100 text-amber-700 border-amber-200",
  shipping:  "bg-purple-100 text-purple-700 border-purple-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  issue:     "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  returned:            "bg-rose-100 text-rose-700 border-rose-200",
  partial_return:      "bg-orange-100 text-orange-700 border-orange-200",
  returned_no_restock: "bg-stone-200 text-stone-700 border-stone-300",
};


export default function Orders() {
  const { t } = useT();
  const [, navigate] = useLocation();
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState<string>("newest");
  const [page, setPage]     = useState(1);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage]     = useState<string>("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [printModal, setPrintModal]   = useState<{ open: boolean; orders: any[] }>({ open: false, orders: [] });

  const debouncedSearch = useDebounce(search, 300);
  const queryClient     = useQueryClient();
  const { toast }       = useToast();
  const deleteOrder     = useAdminDeleteOrder();

  const handleDelete = (id: string) => {
    deleteOrder.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: t("orders.toast.deleted") });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
        },
        onError: () => toast({ title: t("orders.toast.deleteError"), variant: "destructive" }),
      }
    );
  };

  const { data: response, isLoading } = useAdminListOrders({} as Parameters<typeof useAdminListOrders>[0]);
  const allOrders = response?.data ?? [];

  const filtered = useMemo(() => {
    let arr = [...allOrders];
    if (stageFilter !== "all") {
      arr = arr.filter((o) => (o as any).deliveryStage === stageFilter);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      arr = arr.filter((o) =>
        (o.orderNumber ?? "").toLowerCase().includes(q) ||
        (o.email ?? "").toLowerCase().includes(q) ||
        ((o.shippingAddress as any)?.fullName ?? "").toLowerCase().includes(q) ||
        ((o.shippingAddress as any)?.phone ?? "").includes(q)
      );
    }
    switch (sort) {
      case "oldest":     arr.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()); break;
      case "total_desc": arr.sort((a, b) => (b.total ?? 0) - (a.total ?? 0)); break;
      case "total_asc":  arr.sort((a, b) => (a.total ?? 0) - (b.total ?? 0)); break;
      default:           arr.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    }
    return arr;
  }, [allOrders, stageFilter, debouncedSearch, sort]);

  const total      = filtered.length;
  const pageCount  = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allPageSelected = pageOrders.length > 0 && pageOrders.every((o) => selected.has(o.id));
  const somePageSelected = pageOrders.some((o) => selected.has(o.id));
  const someSelected     = selected.size > 0;

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected((s) => { const n = new Set(s); pageOrders.forEach((o) => n.delete(o.id)); return n; });
    } else {
      setSelected((s) => { const n = new Set(s); pageOrders.forEach((o) => n.add(o.id)); return n; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleTabChange = (stage: StageFilter) => {
    setStageFilter(stage);
    setPage(1);
    setSelected(new Set());
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Bulk stage change — calls the same endpoint as single-order detail page,
  // which automatically sends push notification + in-app notification to each customer.
  const applyBulkStage = async () => {
    if (!bulkStage || selected.size === 0) return;
    setBulkApplying(true);
    let ok = 0, fail = 0;
    for (const id of selected) {
      try {
        const res = await adminFetch(`/admin/orders/${id}/delivery-stage`, {
          method: "POST",
          body: JSON.stringify({ stage: bulkStage }),
        });
        if (res.error) fail++; else ok++;
      } catch { fail++; }
    }
    setBulkApplying(false);
    queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    if (fail === 0) {
      toast({ title: t("orders.bulk.stageSuccess", { n: ok }) });
    } else {
      toast({ title: t("orders.bulk.stagePartial", { ok, fail }), variant: "destructive" });
    }
    setSelected(new Set());
    setBulkStage("");
  };

  const handleBulkPrint = () => {
    const toPrint = allOrders.filter((o) => selected.has(o.id));
    if (toPrint.length === 0) return;
    setPrintModal({ open: true, orders: toPrint });
  };

  const handlePrintPdf = (orders: any[]) => {
    setPrintModal({ open: false, orders: [] });
    for (const o of orders) {
      const num = (o.orderNumber ?? "").replace(/^#/, "");
      window.open(`https://moramoda.tech/store/order/${num}`, "_blank", "noopener");
    }
  };

  const handlePrintThermal = (orders: any[]) => {
    setPrintModal({ open: false, orders: [] });
    printReceipts(orders);
  };

  const stageBadge = (stage: string | undefined) => {
    const s   = stage ?? "confirmed";
    const cls = STAGE_COLORS[s] ?? "bg-muted text-muted-foreground border-border";
    return (
      <Badge variant="outline" className={`text-xs border ${cls}`}>
        {t(`orders.stage.${s}` as any) || s}
      </Badge>
    );
  };

  return (
    <PageContainer>
      <PageHeader title={t("orders.title")} subtitle={t("orders.subtitle")} />

      {/* ── Stage filter chips ── */}
      <div className="flex gap-2 flex-wrap">
        {STAGE_TABS.map(({ key, labelKey, icon: Icon }) => {
          const active = stageFilter === key;
          const count  = key === "all"
            ? allOrders.length
            : allOrders.filter((o) => (o as any).deliveryStage === key).length;
          return (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {t(labelKey as any)}
              <span className={`text-xs ${active ? "opacity-75" : "opacity-50"}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── Search + Sort ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("orders.searchPlaceholder")}
            className="ps-9"
            value={search}
            onChange={handleSearch}
          />
        </div>
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <ArrowUpDown className="h-3.5 w-3.5 me-1 text-muted-foreground" />
            <SelectValue placeholder={t("action.sort")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("orders.sort.newest")}</SelectItem>
            <SelectItem value="oldest">{t("orders.sort.oldest")}</SelectItem>
            <SelectItem value="total_desc">{t("orders.sort.totalDesc")}</SelectItem>
            <SelectItem value="total_asc">{t("orders.sort.totalAsc")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Bulk actions bar (appears when any row is selected) ── */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-semibold text-primary">
            {t("orders.bulk.selected", { n: selected.size })}
          </span>
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <Select value={bulkStage} onValueChange={setBulkStage}>
              <SelectTrigger className="w-48 h-8 text-sm">
                <SelectValue placeholder={t("orders.bulk.changeStage")} />
              </SelectTrigger>
              <SelectContent>
                {STAGE_TABS.filter((s) => !BULK_EXCLUDED_STAGES.has(s.key)).map(({ key, labelKey }) => (
                  <SelectItem key={key} value={key}>{t(labelKey as any)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!bulkStage || bulkApplying}
              onClick={applyBulkStage}
              className="gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              {bulkApplying ? t("common.loading") : t("orders.bulk.apply")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleBulkPrint}>
              <Printer className="w-3.5 h-3.5" />
              {t("orders.bulk.print")}
            </Button>
            <Button size="sm" variant="ghost" className="ms-auto" onClick={() => setSelected(new Set())}>
              {t("action.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* ── Desktop table ── */}
      <div className="hidden md:block bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 ps-4">
                  <Checkbox
                    checked={allPageSelected}
                    data-state={somePageSelected && !allPageSelected ? "indeterminate" : undefined}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all on this page"
                  />
                </TableHead>
                <TableHead>{t("orders.col.order")}</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("orders.col.customer")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-end">{t("common.total")}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">{t("common.loading")}</TableCell>
                </TableRow>
              ) : pageOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Inbox className="h-8 w-8 mb-2 opacity-50" />
                      <p>{t("orders.empty")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className={`cursor-pointer ${selected.has(order.id) ? "bg-primary/5" : ""}`}
                  >
                    {/* Checkbox — stopPropagation so row click doesn't navigate */}
                    <TableCell
                      className="ps-4 w-10"
                      onClick={(e) => { e.stopPropagation(); toggleOne(order.id); }}
                    >
                      <Checkbox
                        checked={selected.has(order.id)}
                        onCheckedChange={() => toggleOne(order.id)}
                        aria-label={`Select order ${order.orderNumber}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {order.createdAt ? fmt(order.createdAt, "MMM d, h:mm a") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="leading-tight">
                        <p className="text-sm">{order.email}</p>
                        {(order.shippingAddress as any)?.phone && (
                          <p className="text-xs text-muted-foreground">{(order.shippingAddress as any).phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{stageBadge((order as any).deliveryStage)}</TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">{formatIQD(order.total)}</TableCell>
                    <TableCell
                      className="text-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("orders.delete.title", { n: order.orderNumber })}</AlertDialogTitle>
                            <AlertDialogDescription>{t("orders.delete.desc")}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(order.id)}>{t("action.delete")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-3">
        {/* Mobile select-all row */}
        {!isLoading && pageOrders.length > 0 && (
          <div
            className="flex items-center gap-3 px-1 py-1 cursor-pointer select-none"
            onClick={toggleSelectAll}
          >
            <Checkbox
              checked={allPageSelected}
              data-state={somePageSelected && !allPageSelected ? "indeterminate" : undefined}
              onCheckedChange={toggleSelectAll}
              onClick={(e) => e.stopPropagation()}
              aria-label="Select all"
            />
            <span className="text-sm text-muted-foreground">
              {allPageSelected ? t("action.deselectAll") : t("action.selectAll")}
              {someSelected && ` — ${selected.size} ${t("orders.bulk.selectedShort")}`}
            </span>
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
        ) : pageOrders.length === 0 ? (
          <EmptyState icon={Inbox} title={t("orders.empty")} description={t("orders.empty.desc")} />
        ) : (
          pageOrders.map((order) => (
            <div
              key={order.id}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                selected.has(order.id) ? "border-primary bg-primary/5" : "bg-card"
              }`}
            >
              {/* Checkbox — tap to toggle */}
              <div
                className="pt-0.5 shrink-0"
                onClick={(e) => { e.stopPropagation(); toggleOne(order.id); }}
              >
                <Checkbox
                  checked={selected.has(order.id)}
                  onCheckedChange={() => toggleOne(order.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5"
                />
              </div>

              {/* Order info — tap to open */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{order.orderNumber}</span>
                  <span className="font-semibold tabular-nums">{formatIQD(order.total)}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{order.email}</p>
                {(order.shippingAddress as any)?.phone && (
                  <p className="text-xs text-muted-foreground">{(order.shippingAddress as any).phone}</p>
                )}
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  {stageBadge((order as any).deliveryStage)}
                  <span className="text-xs text-muted-foreground">
                    {order.createdAt ? fmt(order.createdAt, "MMM d, h:mm a") : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ── */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("orders.pagination", {
              from: Math.min((page - 1) * PAGE_SIZE + 1, total),
              to: Math.min(page * PAGE_SIZE, total),
              total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <span className="text-sm font-medium tabular-nums">{page} / {pageCount}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Print Choice Modal ── */}
      <Dialog open={printModal.open} onOpenChange={(v) => setPrintModal((s) => ({ ...s, open: v }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">
              {t("orders.print.title")}
              {printModal.orders.length > 1 && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {printModal.orders.length} {t("orders.bulk.selectedShort")}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2 pb-2">
            {/* PDF option */}
            <button
              onClick={() => handlePrintPdf(printModal.orders)}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <FileText className="w-7 h-7 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-base leading-tight">{t("orders.print.pdf")}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{t("orders.print.pdf.desc")}</p>
              </div>
            </button>

            {/* Thermal option */}
            <button
              onClick={() => handlePrintThermal(printModal.orders)}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <Thermometer className="w-7 h-7 text-orange-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-base leading-tight">{t("orders.print.thermal")}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{t("orders.print.thermal.desc")}</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
