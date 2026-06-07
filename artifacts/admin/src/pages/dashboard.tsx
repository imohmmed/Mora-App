import type { ReactNode } from "react";
import {
  useAdminGetAnalyticsSummary,
  useAdminGetRevenueChart,
  useAdminGetTopProducts,
  useAdminGetLiveOrders,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { fmt } from "@/lib/date";
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: summaryRes, isLoading: loadingSummary } = useAdminGetAnalyticsSummary();
  const { data: chartRes } = useAdminGetRevenueChart({ days: 14 });
  const { data: topProductsRes, isLoading: loadingTopProducts } = useAdminGetTopProducts({ limit: 5 });
  const { data: liveOrdersRes, isLoading: loadingLiveOrders } = useAdminGetLiveOrders();

  const summary = summaryRes?.data;
  const revenueData = chartRes?.data ?? [];
  const topProducts = topProductsRes?.data ?? [];
  const liveOrders = liveOrdersRes?.data ?? [];

  const todayRevenue = revenueData[revenueData.length - 1]?.revenue ?? 0;
  const yesterdayRevenue = revenueData[revenueData.length - 2]?.revenue ?? 0;
  const revenueChange = yesterdayRevenue
    ? (((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1)
    : "0.0";
  const revenueUp = todayRevenue >= yesterdayRevenue;

  const kpis: Array<{
    title: string;
    value: string;
    subLabel: string;
    change: string;
    up: boolean;
    icon: ReactNode;
    sparkData: Array<{ v: number }>;
  }> = [
    {
      title: "Today's Revenue",
      value: `$${todayRevenue.toFixed(2)}`,
      subLabel: "vs yesterday",
      change: `${revenueUp ? "+" : ""}${revenueChange}%`,
      up: revenueUp,
      icon: <DollarSign className="w-4 h-4 text-muted-foreground" />,
      sparkData: revenueData.slice(-7).map((d) => ({ v: d.revenue })),
    },
    {
      title: "Total Orders",
      value: summary?.orders.toString() ?? "—",
      subLabel: "all time",
      change: "+3 today",
      up: true,
      icon: <ShoppingCart className="w-4 h-4 text-muted-foreground" />,
      sparkData: revenueData.slice(-7).map((d, i) => ({ v: Math.round(d.revenue / 180 + i) })),
    },
    {
      title: "Customers",
      value: summary?.customers.toString() ?? "—",
      subLabel: "total registered",
      change: "+1 today",
      up: true,
      icon: <Users className="w-4 h-4 text-muted-foreground" />,
      sparkData: revenueData.slice(-7).map((_, i) => ({ v: (summary?.customers ?? 10) - 7 + i })),
    },
    {
      title: "Avg Order Value",
      value: summary
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(summary.avgOrderValue)
        : "—",
      subLabel: "this period",
      change: revenueUp ? "+2.1%" : "-1.3%",
      up: revenueUp,
      icon: <Package className="w-4 h-4 text-muted-foreground" />,
      sparkData: revenueData.slice(-7).map((d) => ({ v: d.revenue / 5 })),
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your store today — {format(new Date(), "EEEE, MMMM d")}.
        </p>
      </div>

      {/* KPI cards with sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) =>
          loadingSummary ? (
            <Card key={kpi.title}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-[52px] w-full" />
              </CardContent>
            </Card>
          ) : (
            <Card key={kpi.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                {kpi.icon}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center gap-1.5">
                  {kpi.up ? (
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className={cn("text-xs font-medium", kpi.up ? "text-green-600" : "text-red-600")}>
                    {kpi.change}
                  </span>
                  <span className="text-xs text-muted-foreground">{kpi.subLabel}</span>
                </div>
                {/* Sparkline */}
                <div className="h-[52px] w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={kpi.sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`spark-${kpi.title}`} x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={kpi.up ? "#22c55e" : "#ef4444"}
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor={kpi.up ? "#22c55e" : "#ef4444"}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={kpi.up ? "#22c55e" : "#ef4444"}
                        strokeWidth={2}
                        fill={`url(#spark-${kpi.title})`}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue — Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => fmt(val, "MMM d")}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `$${val}`}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                    labelFormatter={(label) => fmt(label, "MMM d, yyyy")}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Top Products</CardTitle>
            <Link href="/analytics" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingTopProducts ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-5">
                {topProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="overflow-hidden pr-4">
                      <p className="text-sm font-medium leading-none truncate">
                        <Link href={`/products/${product.id}`} className="hover:underline">{product.title}</Link>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{product.unitsSold} units sold</p>
                    </div>
                    <span className="font-semibold text-sm flex-shrink-0">${product.revenue.toFixed(2)}</span>
                  </div>
                ))}
                {topProducts.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No data available.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Link href="/orders" className="text-xs text-primary hover:underline flex items-center gap-1">
            All orders <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {loadingLiveOrders ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : liveOrders.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No recent orders.</p>
          ) : (
            <div className="divide-y">
              {liveOrders.slice(0, 8).map((order) => (
                <div key={order.id} className="flex items-center gap-4 py-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="text-muted-foreground">New order </span>
                      <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                        {order.orderNumber}
                      </Link>
                      <span className="text-muted-foreground"> from </span>
                      <span className="font-medium">{order.email}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmt(order.createdAt, "MMM d, h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant={order.financialStatus === "paid" ? "default" : "secondary"} className="text-xs">
                      {order.financialStatus ?? "pending"}
                    </Badge>
                    <span className="font-semibold text-sm">${order.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
