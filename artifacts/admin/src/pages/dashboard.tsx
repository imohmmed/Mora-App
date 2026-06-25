import {
  useAdminGetAnalyticsSummary,
  useAdminGetRevenueChart,
  useAdminGetTopProducts,
  useAdminGetLiveOrders,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageHeader, SectionCard } from "@/components/ui/page-primitives";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ar as arLocale } from "date-fns/locale";
import { fmt } from "@/lib/date";
import { Package, ShoppingCart, Users, DollarSign, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { formatIQD } from "@/lib/format";
import { useT } from "@/i18n/LanguageContext";

export default function Dashboard() {
  const { t, lang } = useT();
  const { data: summaryRes, isLoading: loadingSummary } = useAdminGetAnalyticsSummary();
  const { data: chartRes } = useAdminGetRevenueChart({ days: 14 });
  const { data: topProductsRes, isLoading: loadingTopProducts } = useAdminGetTopProducts({ limit: 5 });
  const { data: liveOrdersRes, isLoading: loadingLiveOrders } = useAdminGetLiveOrders();

  const summary = summaryRes?.data;
  const revenueData = chartRes?.data ?? [];
  const topProducts = topProductsRes?.data ?? [];
  const liveOrders = liveOrdersRes?.data ?? [];

  const dateLocale = lang === "ar" ? { locale: arLocale } : undefined;
  const today = format(new Date(), "EEEE, d MMMM", dateLocale);

  const todayRevenue = revenueData[revenueData.length - 1]?.revenue ?? 0;
  const yesterdayRevenue = revenueData[revenueData.length - 2]?.revenue ?? 0;
  const revenueChange = yesterdayRevenue ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
  const revenueUp = todayRevenue >= yesterdayRevenue;

  const kpis = [
    {
      key: "rev",
      label: t("dashboard.kpi.revenue"),
      value: formatIQD(todayRevenue),
      hint: t("dashboard.kpi.revenue.sub"),
      delta: revenueChange,
      icon: DollarSign,
      sparkData: revenueData.slice(-7).map((d) => ({ v: d.revenue })),
      up: revenueUp,
    },
    {
      key: "orders",
      label: t("dashboard.kpi.orders"),
      value: summary?.orders.toString() ?? "—",
      hint: t("dashboard.kpi.orders.sub"),
      icon: ShoppingCart,
      sparkData: revenueData.slice(-7).map((d, i) => ({ v: Math.round(d.revenue / 180 + i) })),
      up: true,
    },
    {
      key: "customers",
      label: t("dashboard.kpi.customers"),
      value: summary?.customers.toString() ?? "—",
      hint: t("dashboard.kpi.customers.sub"),
      icon: Users,
      sparkData: revenueData.slice(-7).map((_, i) => ({ v: (summary?.customers ?? 10) - 7 + i })),
      up: true,
    },
    {
      key: "aov",
      label: t("dashboard.kpi.aov"),
      value: summary ? formatIQD(summary.avgOrderValue) : "—",
      hint: t("dashboard.kpi.aov.sub"),
      delta: revenueUp ? 2.1 : -1.3,
      icon: Package,
      sparkData: revenueData.slice(-7).map((d) => ({ v: d.revenue / 5 })),
      up: revenueUp,
    },
  ];

  const viewAllLink = (href: string, label: string) => (
    <Link href={href} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
      {label} <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
    </Link>
  );

  return (
    <PageContainer>
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle", { date: today })} />

      {/* KPI cards with sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return loadingSummary ? (
            <Card key={kpi.key} className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-[44px] w-full" />
            </Card>
          ) : (
            <Card key={kpi.key} className="p-5 flex flex-col gap-2 overflow-hidden hover-elevate">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                <span className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight tabular-nums">{kpi.value}</div>
              <div className="flex items-center gap-1.5 text-xs">
                {kpi.delta !== undefined && (
                  <span className={cn("inline-flex items-center gap-0.5 font-semibold", kpi.up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                    {kpi.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {Math.abs(kpi.delta).toFixed(1)}%
                  </span>
                )}
                <span className="text-muted-foreground">{kpi.hint}</span>
              </div>
              <div className="h-[44px] w-full pt-1" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kpi.sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`spark-${kpi.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={kpi.up ? "#22c55e" : "#ef4444"} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={kpi.up ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={kpi.up ? "#22c55e" : "#ef4444"}
                      strokeWidth={2}
                      fill={`url(#spark-${kpi.key})`}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Revenue Chart */}
        <SectionCard
          className="lg:col-span-2"
          title={t("dashboard.revenueChart")}
          bodyClassName="pt-2"
        >
          <div className="h-[280px] w-full" dir="ltr">
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
                  tickFormatter={(val) => `${Number(val).toLocaleString("en-US")}`}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [formatIQD(value), t("dashboard.revenue")]}
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
        </SectionCard>

        {/* Top Products */}
        <SectionCard
          title={t("dashboard.topProducts")}
          actions={viewAllLink("/analytics", t("action.viewAll"))}
        >
          {loadingTopProducts ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : topProducts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">{t("dashboard.noData")}</p>
          ) : (
            <div className="space-y-5">
              {topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-4">
                  <div className="overflow-hidden min-w-0">
                    <p className="text-sm font-medium leading-none truncate">
                      <Link href={`/products/${product.id}`} className="hover:underline">{product.title}</Link>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("dashboard.unitsSold", { n: product.unitsSold })}
                    </p>
                  </div>
                  <span className="font-semibold text-sm flex-shrink-0 tabular-nums">{formatIQD(product.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Activity Feed */}
      <SectionCard
        title={t("dashboard.recentActivity")}
        actions={viewAllLink("/orders", t("dashboard.allOrders"))}
        bodyClassName="p-0"
      >
        {loadingLiveOrders ? (
          <div className="space-y-3 p-5">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : liveOrders.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">{t("dashboard.noRecentOrders")}</p>
        ) : (
          <div className="divide-y">
            {liveOrders.slice(0, 8).map((order) => (
              <div key={order.id} className="flex items-center gap-4 px-5 py-3.5 hover-elevate">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    <span className="text-muted-foreground">{t("dashboard.newOrderFrom")} </span>
                    <span className="font-medium">{order.email}</span>
                    {" · "}
                    <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                      {order.orderNumber}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmt(order.createdAt, "MMM d, h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge variant={order.financialStatus === "paid" ? "default" : "secondary"} className="text-xs">
                    {order.financialStatus === "paid" ? t("status.paid") : t("status.pending")}
                  </Badge>
                  <span className="font-semibold text-sm tabular-nums">{formatIQD(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}
