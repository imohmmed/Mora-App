import { useState, useMemo } from "react";
import { useAdminListOrders } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Inbox, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";

const PAGE_SIZE = 10;

type OrderTab = "all" | "orders" | "drafts" | "abandoned";

export default function Orders() {
  const [tab, setTab] = useState<OrderTab>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

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

  const statusBadge = (financial: string | undefined, fulfillment: string | undefined | null) => (
    <div className="flex flex-wrap gap-1">
      <Badge variant={financial === "paid" ? "default" : "secondary"} className="text-xs">
        {financial ?? "pending"}
      </Badge>
      <Badge variant={fulfillment === "fulfilled" ? "outline" : "secondary"} className="text-xs">
        {fulfillment || "unfulfilled"}
      </Badge>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">Manage and fulfill customer orders.</p>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="abandoned">Abandoned</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders or email..."
            className="pl-9"
            value={search}
            onChange={handleSearch}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Status</SelectItem>
            <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="total_desc">Highest Total</SelectItem>
            <SelectItem value="total_asc">Lowest Total</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Inbox className="h-8 w-8 mb-2 opacity-50" />
                    <p>No orders found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer group relative">
                  <TableCell className="font-medium">
                    <Link href={`/orders/${order.id}`} className="absolute inset-0">
                      <span className="sr-only">View {order.orderNumber}</span>
                    </Link>
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {order.createdAt ? format(new Date(order.createdAt), "MMM d, h:mm a") : "—"}
                  </TableCell>
                  <TableCell>{order.email}</TableCell>
                  <TableCell>{statusBadge(order.financialStatus, order.fulfillmentStatus)}</TableCell>
                  <TableCell className="text-right font-semibold">${order.total.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No orders found.</p>
          </div>
        ) : (
          orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="cursor-pointer hover:shadow-sm transition-shadow active:opacity-80">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{order.orderNumber}</span>
                    <span className="font-semibold">${order.total.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{order.email}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <Badge variant={order.financialStatus === "paid" ? "default" : "secondary"} className="text-xs">
                        {order.financialStatus ?? "pending"}
                      </Badge>
                      <Badge variant={order.fulfillmentStatus === "fulfilled" ? "outline" : "secondary"} className="text-xs">
                        {order.fulfillmentStatus || "unfulfilled"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {order.createdAt ? format(new Date(order.createdAt), "MMM d, h:mm a") : "—"}
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
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{page} / {pageCount}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
