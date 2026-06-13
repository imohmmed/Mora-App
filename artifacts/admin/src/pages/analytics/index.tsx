import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api";
import { useAdminGetLiveOrders, useAdminGetAnalyticsReports } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Link } from "wouter";
import {
  Calendar, ChevronDown, RefreshCw, TrendingUp, TrendingDown,
  Minus, Users, ShoppingCart, Package, DollarSign, Activity,
  Info, ArrowUpRight, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type OverviewData = {
  grossSales: number;
  returningCustomerRate: number;
  ordersFulfilled: number;
  orders: number;
  avgOrderValue: number;
  totalSalesBreakdown: {
    grossSales: number; discounts: number; returns: number; netSales: number;
    shippingCharges: number; returnFees: number; taxes: number; totalSales: number;
  };
  salesOverTime: { date: string; revenue: number; orders: number }[];
  hourlyBreakdown: { time: string; revenue: number }[];
  salesByProduct: { title: string; units: number; revenue: number }[];
  sellThrough: { title: string; soldCount: number; revenue: number }[];
  cohort: { month: string; total: number; returned: number; rate: number }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtIQD = (n: number) =>
  `IQD ${Math.round(n).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;

const fmtIQDShort = (n: number) =>
  `${Math.round(n).toLocaleString("en-US")} IQD`;

function toDateStr(d: Date) {
  return d.toISOString().substring(0, 10);
}

function fmtDateLabel(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Date presets ─────────────────────────────────────────────────────────────

type Preset = { label: string; from: string; to: string };

function buildPresets(): Preset[] {
  const t  = new Date();
  const td = toDateStr(t);
  const yd = toDateStr(new Date(t.getTime() - 86_400_000));
  const d7 = toDateStr(new Date(t.getTime() - 6 * 86_400_000));
  const d30 = toDateStr(new Date(t.getTime() - 29 * 86_400_000));
  return [
    { label: "Today",       from: td,  to: td  },
    { label: "Yesterday",   from: yd,  to: yd  },
    { label: "Last 7 days", from: d7,  to: td  },
    { label: "Last 30 days",from: d30, to: td  },
  ];
}

// ─── Mini sparkline inside KPI card ───────────────────────────────────────────

function MiniSparkline({ data, color = "#2196F3" }: { data: number[]; color?: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── KPI row item ─────────────────────────────────────────────────────────────

function KpiRow({
  label, value, spark, isLoading,
}: {
  label: string; value: string; spark: number[]; isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {isLoading ? (
          <Skeleton className="h-6 w-32 mt-1" />
        ) : (
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-semibold">{value}</span>
            <span className="text-xs text-muted-foreground">—</span>
          </div>
        )}
      </div>
      {!isLoading && <MiniSparkline data={spark} />}
    </div>
  );
}

// ─── "No tracking data" placeholder ──────────────────────────────────────────

function NoTracking({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground text-center py-8">No tracking data for this date range</p>
      </CardContent>
    </Card>
  );
}

// ─── Total sales over time chart ──────────────────────────────────────────────

function SalesOverTimeChart({ data, isSingleDay }: { data: OverviewData; isSingleDay: boolean }) {
  const chartData = isSingleDay
    ? data.hourlyBreakdown
    : data.salesOverTime.map(d => ({ time: fmtDateLabel(d.date).replace(/,\s*\d{4}/, ""), revenue: d.revenue }));

  const maxVal = Math.max(...chartData.map(d => d.revenue), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Total sales over time</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{fmtIQD(data.grossSales)}</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-blue-500" />
            Current period
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2196F3" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={isSingleDay ? 3 : "preserveStartEnd"}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v === 0 ? `IQD 0` : `IQD ${Math.round(v / 1000)}k`}
                domain={[0, Math.ceil(maxVal * 1.2)]}
              />
              <Tooltip
                formatter={(v: number) => [fmtIQDShort(v), "Revenue"]}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2196F3" strokeWidth={2} fill="url(#salesGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Average order value chart ─────────────────────────────────────────────────

function AvgOrderValueChart({ data, isSingleDay }: { data: OverviewData; isSingleDay: boolean }) {
  const chartData = isSingleDay
    ? data.hourlyBreakdown.map(d => ({ time: d.time, value: d.revenue > 0 ? data.avgOrderValue : 0 }))
    : data.salesOverTime.map(d => ({
        time: fmtDateLabel(d.date).replace(/,\s*\d{4}/, ""),
        value: d.orders > 0 ? Math.round(d.revenue / d.orders) : 0,
      }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Average order value over time</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{fmtIQD(data.avgOrderValue)}</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2196F3" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={isSingleDay ? 3 : "preserveStartEnd"} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={v => v === 0 ? "IQD 0" : `IQD ${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => [fmtIQDShort(v), "Avg Order Value"]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Area type="monotone" dataKey="value" stroke="#2196F3" strokeWidth={2} fill="url(#avgGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Conversion rate (0% — no tracking) ──────────────────────────────────────

function ConversionRateChart({ isSingleDay }: { isSingleDay: boolean }) {
  const n = isSingleDay ? 24 : 30;
  const flat = Array.from({ length: n }, (_, i) => ({ time: String(i), value: 0 }));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Conversion rate over time</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">0%</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={flat} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Area type="monotone" dataKey="value" stroke="#2196F3" strokeWidth={2} fill="none" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
          <Info className="h-3 w-3" />
          Requires session tracking integration
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Sales breakdown table ─────────────────────────────────────────────────────

function SalesBreakdownTable({ bd }: { bd: OverviewData["totalSalesBreakdown"] }) {
  const rows: { label: string; value: number; indent?: boolean; bold?: boolean }[] = [
    { label: "Gross sales",      value: bd.grossSales },
    { label: "Discounts",        value: bd.discounts,  indent: true },
    { label: "Returns",          value: bd.returns,    indent: true },
    { label: "Net sales",        value: bd.netSales,   bold: true },
    { label: "Shipping charges", value: bd.shippingCharges },
    { label: "Return fees",      value: bd.returnFees, indent: true },
    { label: "Taxes",            value: bd.taxes },
    { label: "Total sales",      value: bd.totalSales, bold: true },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Total sales breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {rows.map(row => (
            <div key={row.label} className={cn("flex justify-between items-center py-2.5", row.indent && "pl-4")}>
              <span className={cn("text-sm text-blue-600 hover:underline cursor-pointer", row.bold && "font-semibold text-foreground")}>
                {row.label}
              </span>
              <div className="flex items-center gap-3">
                <span className={cn("text-sm font-medium", row.bold && "font-semibold")}>
                  {fmtIQD(row.value)}
                </span>
                <span className="text-xs text-muted-foreground">—</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sales by product table ────────────────────────────────────────────────────

function SalesByProductTable({ products }: { products: OverviewData["salesByProduct"] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Total sales by product</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {products.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No data for this date range</p>
        ) : (
          <div className="divide-y">
            {products.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-blue-600 hover:underline cursor-pointer">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.units} unit{p.units !== 1 ? "s" : ""}</p>
                </div>
                <span className="text-sm font-medium">{fmtIQDShort(p.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sell-through rate table ───────────────────────────────────────────────────

function SellThroughTable({ products }: { products: OverviewData["sellThrough"] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Products by sell-through rate</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {products.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No data for this date range</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground text-xs">Product</th>
                  <th className="text-right py-2 font-medium text-muted-foreground text-xs">Units sold</th>
                  <th className="text-right py-2 font-medium text-muted-foreground text-xs">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2 text-blue-600 hover:underline cursor-pointer">{p.title}</td>
                    <td className="py-2 text-right">{p.soldCount.toLocaleString()}</td>
                    <td className="py-2 text-right font-medium">{fmtIQDShort(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Customer cohort table ─────────────────────────────────────────────────────

function CustomerCohortTable({ cohort }: { cohort: OverviewData["cohort"] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Customer cohort analysis</CardTitle>
        <p className="text-xs text-muted-foreground">Retention rate by signup month</p>
      </CardHeader>
      <CardContent className="pt-0">
        {cohort.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No data available</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Cohort</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Customers</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Returned</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cohort.map((c, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium">{c.month}</td>
                    <td className="py-2 text-right">{c.total}</td>
                    <td className="py-2 text-right">{c.returned}</td>
                    <td className="py-2 text-right">
                      <span className={cn(
                        "font-semibold",
                        c.rate >= 50 ? "text-green-600" : c.rate >= 25 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {c.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Conversion rate breakdown ─────────────────────────────────────────────────

function ConversionBreakdown() {
  const cols = [
    { label: "Sessions",           note: "Tracking required" },
    { label: "Added to cart",      note: "Tracking required" },
    { label: "Reached checkout",   note: "Tracking required" },
    { label: "Completed purchase", note: "Tracking required" },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Conversion rate breakdown</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">0%</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-4 gap-3">
          {cols.map(c => (
            <div key={c.label} className="border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className="text-lg font-semibold">0%</p>
              <p className="text-[10px] text-muted-foreground mt-1">0 ↗ 0%</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <Info className="h-3 w-3 flex-shrink-0" />
          Requires session tracking integration to populate
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Live View ─────────────────────────────────────────────────────────────────

function LiveView() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: liveRes, isLoading, dataUpdatedAt } = useAdminGetLiveOrders({ query: { refetchInterval: 30_000 } as any });
  const orders = (liveRes?.data ?? []) as Array<{
    id: string; orderNumber: string; email: string; total: number; status: string; createdAt: string;
  }>;
  const now = new Date();

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground font-medium">Active Now</span>
            </div>
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-xs text-muted-foreground">recent orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold">
              {orders.filter(o => o.status === "pending").length}
            </p>
            <p className="text-xs text-muted-foreground">awaiting processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground font-medium">Fulfilled</span>
            </div>
            <p className="text-2xl font-bold">
              {orders.filter(o => o.status === "fulfilled").length}
            </p>
            <p className="text-xs text-muted-foreground">completed orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders feed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium">Live Orders Feed</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Auto-refresh every 30s
            {dataUpdatedAt > 0 && (
              <span>· Updated {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {orders.map(order => {
                const created = new Date(order.createdAt);
                const diffMs = now.getTime() - created.getTime();
                const diffMin = Math.round(diffMs / 60_000);
                const age = diffMin < 60
                  ? `${diffMin}m ago`
                  : diffMin < 1440
                    ? `${Math.round(diffMin / 60)}h ago`
                    : `${Math.round(diffMin / 1440)}d ago`;

                const statusColor: Record<string, string> = {
                  pending:    "bg-yellow-100 text-yellow-700",
                  processing: "bg-blue-100 text-blue-700",
                  fulfilled:  "bg-green-100 text-green-700",
                  cancelled:  "bg-red-100 text-red-700",
                  refunded:   "bg-gray-100 text-gray-600",
                };
                return (
                  <div key={order.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <Link href={`/orders/${order.id}`} className="text-sm font-medium hover:underline text-primary">
                          {order.orderNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">{order.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium capitalize", statusColor[order.status] ?? "bg-muted text-muted-foreground")}>
                        {order.status}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{fmtIQDShort(order.total)}</p>
                        <p className="text-[10px] text-muted-foreground">{age}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab() {
  const { data: reportsRes, isLoading } = useAdminGetAnalyticsReports();
  const reports = (reportsRes?.data ?? []) as Array<{ name: string; value: string; change: string }>;

  const changeColor = (c: string) =>
    c.startsWith("+") ? "text-green-600" : c.startsWith("-") ? "text-red-600" : "text-muted-foreground";

  const ChangeIcon = ({ c }: { c: string }) =>
    c.startsWith("+") ? <TrendingUp className="h-3 w-3 text-green-600" /> :
    c.startsWith("-") ? <TrendingDown className="h-3 w-3 text-red-600" /> :
    <Minus className="h-3 w-3 text-muted-foreground" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Store Reports</CardTitle>
        <p className="text-xs text-muted-foreground">Computed from real order and customer data. Comparison: last 30 days vs. prior 30 days.</p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Report</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Value</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">vs. prior period</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reports.map((report, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{report.name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{report.value}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-medium flex items-center justify-end gap-1", changeColor(report.change))}>
                        <ChangeIcon c={report.change} />
                        {report.change}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Analytics Page ──────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const PRESETS = useMemo(() => buildPresets(), []);
  const [activeTab, setActiveTab] = useState<"analytics" | "reports" | "live">("analytics");
  const [selectedPreset, setSelectedPreset] = useState(0); // "Today"
  const [showPresets, setShowPresets] = useState(false);

  const { from, to } = PRESETS[selectedPreset] || PRESETS[0];
  const isSingleDay = from === to;

  const { data: ov, isLoading } = useQuery({
    queryKey: ["analytics-overview", from, to],
    queryFn: () => adminFetch<OverviewData>(`/admin/analytics/overview?from=${from}&to=${to}`).then(r => r.data),
    enabled: activeTab === "analytics",
    staleTime: 60_000,
  });

  // KPI sparklines — use hourly if single day, daily if range
  const grossSpark = ov
    ? (isSingleDay ? ov.hourlyBreakdown.map(h => h.revenue) : ov.salesOverTime.map(d => d.revenue))
    : Array(24).fill(0);
  const ordSpark   = ov
    ? (isSingleDay ? Array(24).fill(0) : ov.salesOverTime.map(d => d.orders))
    : Array(24).fill(0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Analytics</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">···</span>
          <Button size="sm" variant="default" className="text-xs h-8">
            <ExternalLink className="h-3 w-3 mr-1" />
            New exploration
          </Button>
        </div>
      </div>

      {/* Date selector + currency */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Preset picker */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowPresets(p => !p)}
          >
            <Calendar className="h-3 w-3" />
            {PRESETS[selectedPreset].label}
            <ChevronDown className="h-3 w-3" />
          </Button>
          {showPresets && (
            <div className="absolute top-9 left-0 z-20 bg-background border rounded-lg shadow-lg py-1 w-40">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedPreset(i); setShowPresets(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors",
                    i === selectedPreset && "font-medium text-primary"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range display */}
        <div className="border rounded-md h-8 px-3 flex items-center gap-1 text-xs text-muted-foreground bg-muted/30">
          <Calendar className="h-3 w-3" />
          {isSingleDay ? fmtDateLabel(from) : `${fmtDateLabel(from)} – ${fmtDateLabel(to)}`}
        </div>

        {/* Currency badge */}
        <div className="border rounded-md h-8 px-3 flex items-center text-xs font-medium">
          $≈IQD
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex border-b mb-4">
        {(["analytics", "reports", "live"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "live" ? (
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
                Live View
              </span>
            ) : tab === "analytics" ? "Analytics" : "Reports"}
          </button>
        ))}
      </div>

      {/* ─── Analytics Tab ─────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          {/* KPI rows */}
          <Card>
            <CardContent className="pt-4 pb-0">
              <KpiRow
                label="Gross sales"
                value={fmtIQD(ov?.grossSales ?? 0)}
                spark={grossSpark}
                isLoading={isLoading}
              />
              <KpiRow
                label="Returning customer rate"
                value={`${ov?.returningCustomerRate ?? 0}%`}
                spark={Array(isSingleDay ? 24 : 30).fill(ov?.returningCustomerRate ?? 0)}
                isLoading={isLoading}
              />
              <KpiRow
                label="Orders fulfilled"
                value={String(ov?.ordersFulfilled ?? 0)}
                spark={ordSpark}
                isLoading={isLoading}
              />
              <KpiRow
                label="Orders"
                value={String(ov?.orders ?? 0)}
                spark={ordSpark}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Total sales over time */}
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : ov ? (
            <SalesOverTimeChart data={ov} isSingleDay={isSingleDay} />
          ) : null}

          {/* Sales breakdown */}
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : ov ? (
            <SalesBreakdownTable bd={ov.totalSalesBreakdown} />
          ) : null}

          {/* Sessions over time — no tracking */}
          <NoTracking label="Sessions over time" />

          {/* Total sales by sales channel — no tracking */}
          <NoTracking label="Total sales by sales channel" />

          {/* Average order value */}
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : ov ? (
            <AvgOrderValueChart data={ov} isSingleDay={isSingleDay} />
          ) : null}

          {/* Conversion rate */}
          <ConversionRateChart isSingleDay={isSingleDay} />

          {/* Sales by product */}
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : ov ? (
            <SalesByProductTable products={ov.salesByProduct} />
          ) : null}

          {/* Sessions by device / location / social — no tracking */}
          <NoTracking label="Sessions by device type" />
          <NoTracking label="Sessions by location" />
          <NoTracking label="Total sales by social referrer" />
          <NoTracking label="Sessions by social referrer" />
          <NoTracking label="Sessions by landing page" />
          <NoTracking label="Performance by referring channel" />

          {/* Customer cohort */}
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : ov ? (
            <CustomerCohortTable cohort={ov.cohort} />
          ) : null}

          {/* More no-tracking sections */}
          <NoTracking label="Sessions by referrer" />
          <NoTracking label="Total sales by POS location" />
          <NoTracking label="Total sales by referrer" />

          {/* Products by sell-through rate */}
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : ov ? (
            <SellThroughTable products={ov.sellThrough} />
          ) : null}

          {/* Conversion rate breakdown */}
          <ConversionBreakdown />
        </div>
      )}

      {/* ─── Reports Tab ───────────────────────────────────── */}
      {activeTab === "reports" && <ReportsTab />}

      {/* ─── Live View Tab ─────────────────────────────────── */}
      {activeTab === "live" && <LiveView />}
    </div>
  );
}
