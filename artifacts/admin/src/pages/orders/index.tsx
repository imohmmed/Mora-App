import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/page-primitives";
import { Search, Inbox, ChevronLeft, ChevronRight, ArrowUpDown, Trash2 } from "lucide-react";
import { fmt } from "@/lib/date";
import { formatIQD } from "@/lib/format";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/i18n/LanguageContext";

const PAGE_SIZE = 10;

type OrderTab = "all" | "orders" | "drafts" | "abandoned";

export default function Orders() {
  const { t } = useT();
  const [tab, setTab] = useState<OrderTab>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteOrder = useAdminDeleteOrder();

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

  const { data: response, isLoading } = useAdminListOrders({
    status: status !== "all" ? status : undefined,
    type: tab !== "all" ? (tab as "orders" | "drafts" | "abandoned") : undefined,
    q: debouncedSearch || undefined,
  } as Parameters<typeof useAdminListOrders>[0]);

  const allOrders = response?.data ?? [];

  const sortedOrders = useMemo(() => {
    const arr = [...allOrders];
    switch (sort) {
      case "oldest":
        return arr.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
      case "total_desc":
        return arr.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
      case "total_asc":
        return arr.sort((a, b) => (a.total ?? 0) - (b.total ?? 0));
      default: // newest
        return arr.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    }
  }, [allOrders, sort]);

  const total = response?.meta?.total ?? sortedOrders.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const orders = sortedOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTabChange = (value: string) => {
    setTab(value as OrderTab);
    setPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const financialLabel = (financial: string | undefined) =>
    financial === "paid" ? t("status.paid") : t("status.pending");
  const fulfillmentLabel = (fulfillment: string | undefined | null) =>
    fulfillment === "fulfilled" ? t("orders.status.fulfilled") : t("orders.status.unfulfilled");

  const statusBadge = (financial: string | undefined, fulfillment: string | undefined | null) => (
    <div className="flex flex-wrap gap-1">
      <Badge variant={financial === "paid" ? "default" : "secondary"} className="text-xs">
        {financialLabel(financial)}
      </Badge>
      <Badge variant={fulfillment === "fulfilled" ? "outline" : "secondary"} className="text-xs">
        {fulfillmentLabel(fulfillment)}
      </Badge>
    </div>
  );

  return (
    <PageContainer>
      <PageHeader title={t("orders.title")} subtitle={t("orders.subtitle")} />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
          <TabsTrigger value="orders">{t("orders.tab.orders")}</TabsTrigger>
          <TabsTrigger value="drafts">{t("orders.tab.drafts")}</TabsTrigger>
          <TabsTrigger value="abandoned">{t("orders.tab.abandoned")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
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
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("orders.status.any")}</SelectItem>
            <SelectItem value="unfulfilled">{t("orders.status.unfulfilled")}</SelectItem>
            <SelectItem value="fulfilled">{t("orders.status.fulfilled")}</SelectItem>
            <SelectItem value="cancelled">{t("orders.status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
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

      {/* Desktop table */}
      <div className="hidden md:block bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("orders.col.order")}</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("orders.col.customer")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("orders.col.rating")}</TableHead>
                <TableHead className="text-end">{t("common.total")}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">{t("common.loading")}</TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Inbox className="h-8 w-8 mb-2 opacity-50" />
                      <p>{t("orders.empty")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer group relative">
                    <TableCell className="font-medium">
                      <Link href={`/orders/${order.id}`} className="absolute inset-0">
                        <span className="sr-only">{t("orders.view", { n: order.orderNumber })}</span>
                      </Link>
                      {order.orderNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {order.createdAt ? fmt(order.createdAt, "MMM d, h:mm a") : "—"}
                    </TableCell>
                    <TableCell>{order.email}</TableCell>
                    <TableCell>{statusBadge(order.financialStatus, order.fulfillmentStatus)}</TableCell>
                    <TableCell>
                      {(order as any).reviewRating ? (
                        <span className="flex gap-0.5 text-amber-400" title={`${(order as any).reviewRating}/5`}>
                          {[1,2,3,4,5].map((i) => (
                            <span key={i} style={{ opacity: i <= (order as any).reviewRating ? 1 : 0.2 }}>★</span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">{formatIQD(order.total)}</TableCell>
                    <TableCell className="text-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="relative z-10 h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`btn-delete-order-${order.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("orders.delete.title", { n: order.orderNumber })}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("orders.delete.desc")}
                            </AlertDialogDescription>
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

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
        ) : orders.length === 0 ? (
          <EmptyState icon={Inbox} title={t("orders.empty")} description={t("orders.empty.desc")} />
        ) : (
          orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="cursor-pointer hover:shadow-sm transition-shadow active:opacity-80">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{order.orderNumber}</span>
                    <span className="font-semibold tabular-nums">{formatIQD(order.total)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{order.email}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <Badge variant={order.financialStatus === "paid" ? "default" : "secondary"} className="text-xs">
                        {financialLabel(order.financialStatus)}
                      </Badge>
                      <Badge variant={order.fulfillmentStatus === "fulfilled" ? "outline" : "secondary"} className="text-xs">
                        {fulfillmentLabel(order.fulfillmentStatus)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {order.createdAt ? fmt(order.createdAt, "MMM d, h:mm a") : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("orders.pagination", {
              from: (page - 1) * PAGE_SIZE + 1,
              to: Math.min(page * PAGE_SIZE, total),
              total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <span className="text-sm font-medium tabular-nums">{page} / {pageCount}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
