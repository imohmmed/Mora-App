import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api";
import { useAdminGetLiveOrders } from "@workspace/api-client-react";
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
  Info, ArrowUpRight, ExternalLink, Search, X, ChevronRight,
  Tag, Layers, BookOpen, Settings, User, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LanguageContext";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/page-primitives";

type TFunc = (key: string, vars?: Record<string, string | number>) => string;

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

function buildPresets(_t: TFunc): Preset[] {
  const now = new Date();
  const td = toDateStr(now);
  const yd = toDateStr(new Date(now.getTime() - 86_400_000));
  const d7 = toDateStr(new Date(now.getTime() - 6 * 86_400_000));
  const d30 = toDateStr(new Date(now.getTime() - 29 * 86_400_000));
  return [
    { label: "analytics.preset.today",     from: td,  to: td  },
    { label: "analytics.preset.yesterday", from: yd,  to: yd  },
    { label: "analytics.preset.last7",     from: d7,  to: td  },
    { label: "analytics.preset.last30",    from: d30, to: td  },
  ];
}

// ─── Mini sparkline inside KPI card ───────────────────────────────────────────

function MiniSparkline({ data, color = "#2196F3" }: { data: number[]; color?: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-20 h-8" dir="ltr">
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
  const { t } = useT();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground text-center py-8">{t("analytics.noTrackingData")}</p>
      </CardContent>
    </Card>
  );
}

// ─── Total sales over time chart ──────────────────────────────────────────────

function SalesOverTimeChart({ data, isSingleDay }: { data: OverviewData; isSingleDay: boolean }) {
  const { t } = useT();
  const chartData = isSingleDay
    ? data.hourlyBreakdown
    : data.salesOverTime.map(d => ({ time: fmtDateLabel(d.date).replace(/,\s*\d{4}/, ""), revenue: d.revenue }));

  const maxVal = Math.max(...chartData.map(d => d.revenue), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("analytics.chart.salesOverTime")}</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{fmtIQD(data.grossSales)}</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-blue-500" />
            {t("analytics.chart.currentPeriod")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-40" dir="ltr">
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
                formatter={(v: number) => [fmtIQDShort(v), t("analytics.chart.revenue")]}
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
  const { t } = useT();
  const chartData = isSingleDay
    ? data.hourlyBreakdown.map(d => ({ time: d.time, value: d.revenue > 0 ? data.avgOrderValue : 0 }))
    : data.salesOverTime.map(d => ({
        time: fmtDateLabel(d.date).replace(/,\s*\d{4}/, ""),
        value: d.orders > 0 ? Math.round(d.revenue / d.orders) : 0,
      }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("analytics.chart.avgOrderValue")}</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{fmtIQD(data.avgOrderValue)}</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-40" dir="ltr">
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
              <Tooltip formatter={(v: number) => [fmtIQDShort(v), t("analytics.tooltip.avgOrderValue")]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
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
  const { t } = useT();
  const n = isSingleDay ? 24 : 30;
  const flat = Array.from({ length: n }, (_, i) => ({ time: String(i), value: 0 }));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("analytics.chart.conversionRate")}</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">0%</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-40" dir="ltr">
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
          {t("analytics.requiresTracking")}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Sales breakdown table ─────────────────────────────────────────────────────

function SalesBreakdownTable({ bd }: { bd: OverviewData["totalSalesBreakdown"] }) {
  const { t } = useT();
  const rows: { key: string; label: string; value: number; indent?: boolean; bold?: boolean }[] = [
    { key: "grossSales",      label: t("analytics.breakdown.grossSales"),      value: bd.grossSales },
    { key: "discounts",       label: t("analytics.breakdown.discounts"),       value: bd.discounts,  indent: true },
    { key: "returns",         label: t("analytics.breakdown.returns"),         value: bd.returns,    indent: true },
    { key: "netSales",        label: t("analytics.breakdown.netSales"),        value: bd.netSales,   bold: true },
    { key: "shippingCharges", label: t("analytics.breakdown.shippingCharges"), value: bd.shippingCharges },
    { key: "returnFees",      label: t("analytics.breakdown.returnFees"),      value: bd.returnFees, indent: true },
    { key: "taxes",           label: t("analytics.breakdown.taxes"),           value: bd.taxes },
    { key: "totalSales",      label: t("analytics.breakdown.totalSales"),      value: bd.totalSales, bold: true },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("analytics.breakdown.title")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {rows.map(row => (
            <div key={row.key} className={cn("flex justify-between items-center py-2.5", row.indent && "ps-4")}>
              <span className={cn("text-sm text-blue-600 hover:underline cursor-pointer", row.bold && "font-semibold text-foreground")}>
                {row.label}
              </span>
              <div className="flex items-center gap-3">
                <span className={cn("text-sm font-medium tabular-nums", row.bold && "font-semibold")}>
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
  const { t } = useT();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("analytics.salesByProduct")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {products.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">{t("analytics.noDataRange")}</p>
        ) : (
          <div className="divide-y">
            {products.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-blue-600 hover:underline cursor-pointer">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{t("analytics.units", { n: p.units })}</p>
                </div>
                <span className="text-sm font-medium tabular-nums">{fmtIQDShort(p.revenue)}</span>
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
  const { t } = useT();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("analytics.sellThrough.title")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {products.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">{t("analytics.noDataRange")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-start py-2 font-medium text-muted-foreground text-xs">{t("analytics.col.product")}</th>
                  <th className="text-end py-2 font-medium text-muted-foreground text-xs">{t("analytics.col.unitsSold")}</th>
                  <th className="text-end py-2 font-medium text-muted-foreground text-xs">{t("analytics.col.revenue")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2 text-blue-600 hover:underline cursor-pointer">{p.title}</td>
                    <td className="py-2 text-end tabular-nums">{p.soldCount.toLocaleString()}</td>
                    <td className="py-2 text-end font-medium tabular-nums">{fmtIQDShort(p.revenue)}</td>
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
  const { t } = useT();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("analytics.cohort.title")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("analytics.cohort.subtitle")}</p>
      </CardHeader>
      <CardContent className="pt-0">
        {cohort.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">{t("common.noData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-start py-2 font-medium text-muted-foreground">{t("analytics.cohort.col.cohort")}</th>
                  <th className="text-end py-2 font-medium text-muted-foreground">{t("analytics.cohort.col.customers")}</th>
                  <th className="text-end py-2 font-medium text-muted-foreground">{t("analytics.cohort.col.returned")}</th>
                  <th className="text-end py-2 font-medium text-muted-foreground">{t("analytics.cohort.col.retention")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cohort.map((c, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium">{c.month}</td>
                    <td className="py-2 text-end tabular-nums">{c.total}</td>
                    <td className="py-2 text-end tabular-nums">{c.returned}</td>
                    <td className="py-2 text-end tabular-nums">
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
  const { t } = useT();
  const cols = [
    { key: "sessions",          label: t("analytics.conv.sessions") },
    { key: "addedToCart",       label: t("analytics.conv.addedToCart") },
    { key: "reachedCheckout",   label: t("analytics.conv.reachedCheckout") },
    { key: "completedPurchase", label: t("analytics.conv.completedPurchase") },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("analytics.conversionBreakdown.title")}</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">0%</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cols.map(c => (
            <div key={c.key} className="border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className="text-lg font-semibold">0%</p>
              <p className="text-[10px] text-muted-foreground mt-1">0 ↗ 0%</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <Info className="h-3 w-3 flex-shrink-0" />
          {t("analytics.requiresTrackingPopulate")}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Animated Globe ────────────────────────────────────────────────────────────

const GLOBE_KEYFRAMES = `
@keyframes globe-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-1000px); }
}
@keyframes globe-dot-ring {
  0%   { transform: scale(1);   opacity: 0.9; }
  100% { transform: scale(2.8); opacity: 0; }
}
`;

function WorldMapSVG() {
  return (
    <svg viewBox="0 0 1000 500" width="1000" height="500"
      xmlns="http://www.w3.org/2000/svg" style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <pattern id="ld" x="0" y="0" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1.7" fill="#5ab5ac" opacity="0.85" />
        </pattern>
      </defs>
      {/* Alaska */}
      <path d="M20,68 L65,55 L80,75 L65,95 L35,90 Z" fill="url(#ld)" />
      {/* North America */}
      <path d="M72,58 L175,48 L225,68 L245,98 L235,158 L205,198 L165,218 L132,210 L102,190 L72,158 L52,118 Z" fill="url(#ld)" />
      {/* Central America */}
      <ellipse cx="195" cy="225" rx="24" ry="13" fill="url(#ld)" />
      {/* Caribbean */}
      <ellipse cx="232" cy="218" rx="18" ry="7" fill="url(#ld)" />
      {/* South America */}
      <path d="M175,238 L242,228 L272,260 L282,312 L270,372 L242,412 L212,422 L186,402 L170,362 L158,302 L164,258 Z" fill="url(#ld)" />
      {/* Greenland */}
      <ellipse cx="292" cy="58" rx="34" ry="24" fill="url(#ld)" />
      {/* Iceland */}
      <ellipse cx="422" cy="80" rx="13" ry="8" fill="url(#ld)" />
      {/* UK & Ireland */}
      <ellipse cx="454" cy="145" rx="9" ry="13" fill="url(#ld)" />
      {/* Scandinavia */}
      <path d="M472,88 L512,83 L522,108 L512,128 L482,128 L466,108 Z" fill="url(#ld)" />
      {/* Europe */}
      <path d="M454,130 L532,118 L572,130 L582,162 L562,192 L520,202 L478,192 L454,170 Z" fill="url(#ld)" />
      {/* Russia west */}
      <path d="M530,48 L660,38 L700,60 L695,95 L640,100 L580,95 L530,80 Z" fill="url(#ld)" />
      {/* Russia/Siberia east */}
      <path d="M660,38 L830,30 L862,60 L855,95 L810,100 L740,98 L700,62 Z" fill="url(#ld)" />
      {/* Africa north */}
      <path d="M458,192 L542,188 L572,218 L582,268 L555,300 L500,308 L448,295 L436,258 L442,218 Z" fill="url(#ld)" />
      {/* Africa south */}
      <path d="M448,295 L555,300 L572,345 L558,392 L528,415 L498,418 L468,408 L445,375 L435,330 Z" fill="url(#ld)" />
      {/* Madagascar */}
      <ellipse cx="558" cy="362" rx="9" ry="19" fill="url(#ld)" />
      {/* Middle East / Arabia */}
      <path d="M562,163 L615,158 L632,183 L622,218 L592,232 L562,222 L546,195 Z" fill="url(#ld)" />
      {/* Central Asia */}
      <path d="M582,108 L702,98 L732,128 L722,158 L682,168 L622,163 L582,148 Z" fill="url(#ld)" />
      {/* South Asia / India */}
      <path d="M638,173 L692,173 L702,198 L692,242 L672,262 L650,247 L635,215 L635,190 Z" fill="url(#ld)" />
      {/* Southeast Asia */}
      <path d="M700,188 L772,183 L792,208 L782,242 L752,257 L720,247 L700,223 Z" fill="url(#ld)" />
      {/* Philippines & islands */}
      <ellipse cx="818" cy="225" rx="12" ry="18" fill="url(#ld)" />
      {/* China / East Asia */}
      <path d="M720,113 L820,103 L852,128 L842,163 L800,175 L750,170 L710,153 L710,128 Z" fill="url(#ld)" />
      {/* Korea & Japan */}
      <ellipse cx="858" cy="148" rx="13" ry="28" fill="url(#ld)" />
      <ellipse cx="878" cy="128" rx="8" ry="10" fill="url(#ld)" />
      {/* Indonesia */}
      <path d="M750,262 L838,258 L862,270 L858,285 L820,292 L770,287 L745,275 Z" fill="url(#ld)" />
      {/* Australia */}
      <path d="M790,298 L872,292 L908,315 L913,358 L892,388 L852,398 L812,388 L786,362 L775,325 Z" fill="url(#ld)" />
      {/* New Zealand */}
      <ellipse cx="937" cy="392" rx="9" ry="17" fill="url(#ld)" />
      {/* Svalbard */}
      <ellipse cx="510" cy="50" rx="8" ry="6" fill="url(#ld)" />
    </svg>
  );
}

function AnimatedGlobe({ hasOrders, orderCount }: { hasOrders: boolean; orderCount: number }) {
  const SIZE = 290;
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center", paddingBottom: 8, marginBottom: 4 }}>
      <style>{GLOBE_KEYFRAMES}</style>

      {/* Sphere */}
      <div style={{
        width: SIZE, height: SIZE, borderRadius: "50%", overflow: "hidden",
        position: "relative",
        background: "radial-gradient(ellipse at 38% 32%, #d8f6f4 0%, #a8e4df 28%, #6cc5be 62%, #48a49c 100%)",
        boxShadow: "0 0 0 1px rgba(72,164,156,0.25), 0 12px 40px rgba(72,164,156,0.22), inset 0 0 40px rgba(0,90,85,0.08)",
      }}>
        {/* Scrolling world map (2× for seamless loop) */}
        <div style={{
          position: "absolute", top: "9%", left: 0,
          width: "200%", height: "82%",
          display: "flex",
          animation: "globe-scroll 38s linear infinite",
        }}>
          <WorldMapSVG />
          <WorldMapSVG />
        </div>

        {/* Top-left gloss highlight */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "radial-gradient(ellipse at 28% 26%, rgba(255,255,255,0.48) 0%, transparent 52%)",
          pointerEvents: "none",
        }} />

        {/* Bottom-right shadow depth */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "radial-gradient(ellipse at 74% 74%, rgba(0,80,75,0.22) 0%, transparent 52%)",
          pointerEvents: "none",
        }} />

        {/* Edge vignette */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          boxShadow: "inset 0 0 38px rgba(0,70,65,0.18)",
          pointerEvents: "none",
        }} />

        {/* Iraq / Middle East active dot (lon≈44, lat≈33) */}
        {hasOrders && (
          <div style={{ position: "absolute", top: "31%", left: "60%", zIndex: 10 }}>
            {/* Expanding rings */}
            {[0, 0.55, 1.1].map(delay => (
              <div key={delay} style={{
                position: "absolute",
                top: -10, left: -10,
                width: 28, height: 28,
                borderRadius: "50%",
                backgroundColor: "rgba(139,92,246,0.45)",
                animation: `globe-dot-ring 2s ease-out ${delay}s infinite`,
              }} />
            ))}
            {/* Solid dot */}
            <div style={{
              position: "relative", zIndex: 2,
              width: 10, height: 10,
              borderRadius: "50%",
              backgroundColor: "#7c3aed",
              border: "2px solid rgba(255,255,255,0.9)",
              boxShadow: "0 0 8px rgba(124,58,237,0.8)",
            }} />
          </div>
        )}
      </div>

      {/* Ground shadow */}
      <div style={{
        position: "absolute", bottom: -6,
        left: "50%", transform: "translateX(-50%)",
        width: SIZE * 0.6, height: 18,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.07)",
        filter: "blur(10px)",
      }} />
    </div>
  );
}

// ─── Live View stat card ────────────────────────────────────────────────────────

function LiveStatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-background rounded-xl border p-4 shadow-sm">
      <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <span className={cn("text-xl font-bold", accent && "text-primary")}>{value}</span>
        <div className="w-12 h-0.5 bg-blue-400 rounded mb-1" />
      </div>
    </div>
  );
}

// ─── Live View ─────────────────────────────────────────────────────────────────

function LiveView() {
  const { t } = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: liveRes, isLoading, dataUpdatedAt } = useAdminGetLiveOrders({ query: { refetchInterval: 30_000 } as any });
  const orders = (liveRes?.data ?? []) as Array<{
    id: string; orderNumber: string; email: string; total: number; status: string; createdAt: string;
  }>;
  const now = new Date();

  const totalSales  = orders.reduce((s, o) => s + (o.total || 0), 0);
  const fulfilled   = orders.filter(o => o.status === "fulfilled").length;
  const pending     = orders.filter(o => o.status === "pending").length;

  // Product sales aggregation from recent orders (best effort without line_items here)
  const productMap = new Map<string, number>();
  // For live view, just show order count per status
  const statusColor: Record<string, string> = {
    pending:    "bg-amber-100 text-amber-700",
    processing: "bg-blue-100 text-blue-700",
    fulfilled:  "bg-emerald-100 text-emerald-700",
    cancelled:  "bg-red-100 text-red-700",
    refunded:   "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-4 -mx-2 px-2">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            {t("analytics.live.title")}
          </h2>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              {t("analytics.live.orders")}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              {t("analytics.live.visitorsNow")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
          {dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : t("analytics.live.live")}
        </div>
      </div>

      {/* ── Search bar ────────────────────────────────────── */}
      <div className="relative">
        <div className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <Input className="ps-8 h-9 text-sm bg-muted/30 border-muted" placeholder={t("analytics.live.searchLocation")} readOnly />
      </div>

      {/* ── Animated Globe ────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Skeleton className="w-72 h-72 rounded-full" />
        </div>
      ) : (
        <AnimatedGlobe hasOrders={orders.length > 0} orderCount={orders.length} />
      )}

      {/* ── Stats 2×2 ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <LiveStatCard label={t("analytics.live.visitorsNow")} value="0" />
        <LiveStatCard label={t("analytics.live.totalSales")} value={fmtIQD(totalSales)} accent />
        <LiveStatCard label={t("analytics.live.sessions")} value="0" />
        <LiveStatCard label={t("analytics.live.orders")} value={String(orders.length)} accent />
      </div>

      {/* ── Customer behavior ─────────────────────────────── */}
      <div className="bg-background rounded-xl border p-4 shadow-sm">
        <p className="text-sm font-semibold mb-4">{t("analytics.live.customerBehavior")}</p>
        <div className="grid grid-cols-3 divide-x">
          {[
            { label: t("analytics.live.activeCarts"), value: pending },
            { label: t("analytics.live.checkingOut"), value: 0 },
            { label: t("analytics.live.purchased"),   value: fulfilled },
          ].map(({ label, value }) => (
            <div key={label} className="text-center px-3">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>
        {/* Mini funnel bar */}
        <div className="mt-4 space-y-2">
          {[
            { label: t("analytics.live.activeCarts"), pct: 100, color: "#e0f2fe" },
            { label: t("analytics.live.checkingOut"), pct: 0,   color: "#bae6fd" },
            { label: t("analytics.live.purchased"),   pct: orders.length > 0 ? Math.round((fulfilled / orders.length) * 100) : 0, color: "#38bdf8" },
          ].map(bar => (
            <div key={bar.label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-24 shrink-0">{bar.label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div style={{ width: `${bar.pct}%`, backgroundColor: bar.color, height: "100%", borderRadius: "inherit", transition: "width 0.6s ease" }} />
              </div>
              <span className="w-8 text-end">{bar.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sessions by location ─────────────────────────── */}
      <div className="bg-background rounded-xl border p-4 shadow-sm">
        <p className="text-sm font-semibold mb-3">{t("analytics.live.sessionsByLocation")}</p>
        <p className="text-xs text-muted-foreground text-center py-6">{t("analytics.noDataRange")}</p>
      </div>

      {/* ── New vs returning customers ────────────────────── */}
      <div className="bg-background rounded-xl border p-4 shadow-sm">
        <p className="text-sm font-semibold mb-3">{t("analytics.live.newVsReturning")}</p>
        {orders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">{t("analytics.noDataRange")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t("analytics.live.new"),       value: orders.length - Math.min(2, orders.length), color: "#38bdf8" },
              { label: t("analytics.live.returning"), value: Math.min(2, orders.length),                 color: "#818cf8" },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-2" style={{ background: `${color}30`, border: `2px solid ${color}` }}>
                  <span className="text-lg font-bold" style={{ color }}>{value}</span>
                </div>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Total sales by product ────────────────────────── */}
      <div className="bg-background rounded-xl border p-4 shadow-sm">
        <p className="text-sm font-semibold mb-3">{t("analytics.live.salesByProduct")}</p>
        {orders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">{t("analytics.noDataRange")}</p>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">{t("analytics.live.noSessionTracking")}</p>
        )}
      </div>

      {/* ── Recent orders feed ───────────────────────────── */}
      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold">{t("analytics.live.recentOrders")}</p>
          <span className="text-[10px] text-muted-foreground">{t("analytics.live.autoRefresh")}</span>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-25" />
            <p className="text-sm">{t("analytics.live.noOrders")}</p>
          </div>
        ) : (
          <div className="divide-y">
            {orders.map(order => {
              const diffMs  = now.getTime() - new Date(order.createdAt).getTime();
              const diffMin = Math.round(diffMs / 60_000);
              const age     = diffMin < 60
                ? t("analytics.time.minutesAgo", { n: diffMin })
                : diffMin < 1440
                  ? t("analytics.time.hoursAgo", { n: Math.round(diffMin / 60) })
                  : t("analytics.time.daysAgo", { n: Math.round(diffMin / 1440) });
              const statusLabel = ORDER_STATUS_LABEL[order.status] ? t(ORDER_STATUS_LABEL[order.status]) : order.status;
              return (
                <div key={order.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/orders/${order.id}`} className="text-sm font-medium hover:underline text-primary block truncate">
                        {order.orderNumber}
                      </Link>
                      <p className="text-[11px] text-muted-foreground truncate">{order.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-end shrink-0 ms-2">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusColor[order.status] ?? "bg-muted text-muted-foreground")}>
                      {statusLabel}
                    </span>
                    <div>
                      <p className="text-xs font-semibold">{fmtIQDShort(order.total)}</p>
                      <p className="text-[10px] text-muted-foreground">{age}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity Log Types ───────────────────────────────────────────────────────

type ActivityItem = {
  id: string;
  action: string;
  category: string;
  entityType: string;
  entityId: string | null;
  entityTitle: string;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

// ─── Activity helpers ─────────────────────────────────────────────────────────

const ACTION_META: Record<string, { labelKey: string; color: string; bg: string }> = {
  "order.created":          { labelKey: "analytics.action.order.created",          color: "text-blue-700",   bg: "bg-blue-50"   },
  "order.payment_received": { labelKey: "analytics.action.order.payment_received", color: "text-green-700",  bg: "bg-green-50"  },
  "order.fulfilled":        { labelKey: "analytics.action.order.fulfilled",        color: "text-teal-700",   bg: "bg-teal-50"   },
  "order.cancelled":        { labelKey: "analytics.action.order.cancelled",        color: "text-red-700",    bg: "bg-red-50"    },
  "order.refunded":         { labelKey: "analytics.action.order.refunded",         color: "text-orange-700", bg: "bg-orange-50" },
  "order.processing":       { labelKey: "analytics.action.order.processing",       color: "text-indigo-700", bg: "bg-indigo-50" },
  "order.completed":        { labelKey: "analytics.action.order.completed",        color: "text-green-700",  bg: "bg-green-50"  },
  "order.deleted":          { labelKey: "analytics.action.order.deleted",          color: "text-red-700",    bg: "bg-red-50"    },
  "order.updated":          { labelKey: "analytics.action.order.updated",          color: "text-slate-700",  bg: "bg-slate-50"  },
  "product.created":        { labelKey: "analytics.action.product.created",        color: "text-violet-700", bg: "bg-violet-50" },
  "product.published":      { labelKey: "analytics.action.product.published",      color: "text-green-700",  bg: "bg-green-50"  },
  "product.updated":        { labelKey: "analytics.action.product.updated",        color: "text-slate-700",  bg: "bg-slate-50"  },
  "product.archived":       { labelKey: "analytics.action.product.archived",       color: "text-gray-700",   bg: "bg-gray-50"   },
  "customer.registered":    { labelKey: "analytics.action.customer.registered",    color: "text-pink-700",   bg: "bg-pink-50"   },
  "discount.created":       { labelKey: "analytics.action.discount.created",       color: "text-amber-700",  bg: "bg-amber-50"  },
  "collection.created":     { labelKey: "analytics.action.collection.created",     color: "text-cyan-700",   bg: "bg-cyan-50"   },
  "blog.published":         { labelKey: "analytics.action.blog.published",         color: "text-lime-700",   bg: "bg-lime-50"   },
  "blog.drafted":           { labelKey: "analytics.action.blog.drafted",           color: "text-gray-700",   bg: "bg-gray-50"   },
};

const CATEGORY_LABEL: Record<string, string> = {
  Orders:      "analytics.category.Orders",
  Products:    "analytics.category.Products",
  Customers:   "analytics.category.Customers",
  Discounts:   "analytics.category.Discounts",
  Collections: "analytics.category.Collections",
  Blog:        "analytics.category.Blog",
  Settings:    "analytics.category.Settings",
};

function catLabel(cat: string, t: TFunc) {
  return cat === "All" ? t("common.all") : (CATEGORY_LABEL[cat] ? t(CATEGORY_LABEL[cat]) : cat);
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending:    "analytics.orderStatus.pending",
  processing: "analytics.orderStatus.processing",
  fulfilled:  "analytics.orderStatus.fulfilled",
  cancelled:  "analytics.orderStatus.cancelled",
  refunded:   "analytics.orderStatus.refunded",
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  Orders:      <ShoppingCart className="h-3.5 w-3.5" />,
  Products:    <Package       className="h-3.5 w-3.5" />,
  Customers:   <User          className="h-3.5 w-3.5" />,
  Discounts:   <Tag           className="h-3.5 w-3.5" />,
  Collections: <Layers        className="h-3.5 w-3.5" />,
  Blog:        <BookOpen      className="h-3.5 w-3.5" />,
  Settings:    <Settings      className="h-3.5 w-3.5" />,
};

const CATEGORY_BADGE: Record<string, string> = {
  Orders:      "bg-blue-100 text-blue-800",
  Products:    "bg-violet-100 text-violet-800",
  Customers:   "bg-pink-100 text-pink-800",
  Discounts:   "bg-amber-100 text-amber-800",
  Collections: "bg-cyan-100 text-cyan-800",
  Blog:        "bg-lime-100 text-lime-800",
  Settings:    "bg-gray-100 text-gray-800",
};

function fmtTs(iso: string, t: TFunc) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    ` ${t("analytics.time.at")} ` + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function fmtRelative(iso: string, t: TFunc) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return t("analytics.time.justNow");
  if (mins < 60) return t("analytics.time.minutesAgo", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return t("analytics.time.hoursAgo", { n: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 30) return t("analytics.time.daysAgo", { n: days });
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Activity Detail Panel ────────────────────────────────────────────────────

function ActivityDetailPanel({ item, onClose }: { item: ActivityItem; onClose: () => void }) {
  const { t } = useT();
  const meta = ACTION_META[item.action];
  const metaLabel = meta ? t(meta.labelKey) : item.action;
  const metaColor = meta?.color ?? "text-slate-700";
  const metaBg = meta?.bg ?? "bg-slate-50";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-background border-s shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", metaBg)}>
              <span className={cn("text-lg", metaColor)}>
                {CATEGORY_ICON[item.category] ?? <Activity className="h-4 w-4" />}
              </span>
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">{metaLabel}</p>
              <p className="text-xs text-muted-foreground">{item.entityTitle}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t("analytics.reports.col.category"), value: catLabel(item.category, t) },
              { label: t("analytics.detail.doneBy"),        value: item.actor },
              { label: t("analytics.detail.dateTime"),      value: fmtTs(item.createdAt, t), full: true },
              { label: t("analytics.detail.action"),        value: item.action },
              ...(item.entityId ? [{ label: t("analytics.detail.entityId"), value: item.entityId }] : []),
            ].map(({ label, value, full }) => (
              <div key={label} className={cn("space-y-1", full && "col-span-2")}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-sm font-medium break-all">{value}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Metadata */}
          {Object.keys(item.metadata).length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("analytics.detail.details")}</p>
              <div className="rounded-lg border divide-y">
                {Object.entries(item.metadata).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-start px-4 py-2.5 gap-4">
                    <span className="text-xs text-muted-foreground capitalize shrink-0">
                      {k.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-medium text-end break-all">
                      {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reports / Activity Log Tab ───────────────────────────────────────────────

const ALL_CATEGORIES = ["All", "Orders", "Products", "Customers", "Discounts", "Collections", "Blog"];

function ReportsTab() {
  const { t } = useT();
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("All");
  const [selected, setSelected]   = useState<ActivityItem | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["activity-log", category, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "80" });
      if (category !== "All") params.set("category", category);
      if (debouncedSearch)    params.set("search",   debouncedSearch);
      return adminFetch<ActivityItem[]>(`/admin/analytics/activity?${params}`).then(r => r.data ?? []);
    },
    staleTime: 30_000,
  });
  const items = data ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{t("analytics.reports.activityLog")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("analytics.reports.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> {t("analytics.refresh")}
        </Button>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("analytics.reports.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ps-9 h-9 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                category === cat
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
              )}
            >
              {cat !== "All" && CATEGORY_ICON[cat]}
              {catLabel(cat, t)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 border-b bg-muted/30 px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("analytics.reports.col.activity")}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-28 text-center">{t("analytics.reports.col.category")}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-24 text-center">{t("analytics.reports.col.by")}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-28 text-end">{t("analytics.reports.col.when")}</span>
        </div>

        {isLoading ? (
          <div className="divide-y">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">{t("analytics.reports.noActivity")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? t("analytics.reports.noResultsFor", { q: search }) : t("analytics.reports.noEventsCategory")}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {items.map(item => {
              const meta = ACTION_META[item.action];
              const metaLabel = meta ? t(meta.labelKey) : item.action;
              const metaColor = meta?.color ?? "text-slate-700";
              const metaBg = meta?.bg ?? "bg-slate-50";
              return (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-0 items-center px-4 py-3.5 hover:bg-muted/30 transition-colors text-start group"
                >
                  {/* Activity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", metaBg)}>
                      <span className={metaColor}>
                        {CATEGORY_ICON[item.category] ?? <Activity className="h-3.5 w-3.5" />}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{metaLabel}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.entityTitle}</p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="w-28 flex justify-center">
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium", CATEGORY_BADGE[item.category] ?? "bg-gray-100 text-gray-800")}>
                      {catLabel(item.category, t)}
                    </span>
                  </div>

                  {/* Actor */}
                  <div className="w-24 flex justify-center">
                    <span className="text-xs text-muted-foreground font-medium">{item.actor}</span>
                  </div>

                  {/* Time */}
                  <div className="w-28 flex items-center justify-end gap-1">
                    <span className="text-xs text-muted-foreground">{fmtRelative(item.createdAt, t)}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors rtl:rotate-180" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {!isLoading && items.length > 0 && (
          <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground text-end">
            {t("analytics.reports.eventCount", { n: items.length })}
            {(search || category !== "All") ? ` ${t("analytics.reports.filtered")}` : ""}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && <ActivityDetailPanel item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── Main Analytics Page ──────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { t } = useT();
  const PRESETS = useMemo(() => buildPresets(t), [t]);
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
    <PageContainer className="max-w-4xl space-y-0">
      {/* Header */}
      <PageHeader
        className="mb-4"
        title={
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            {t("analytics.title")}
          </span>
        }
        actions={
          <>
            <span className="text-xs text-muted-foreground">···</span>
            <Button size="sm" variant="default" className="text-xs h-8">
              <ExternalLink className="h-3 w-3 me-1" />
              {t("analytics.newExploration")}
            </Button>
          </>
        }
      />

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
            {t(PRESETS[selectedPreset].label)}
            <ChevronDown className="h-3 w-3" />
          </Button>
          {showPresets && (
            <div className="absolute top-9 start-0 z-20 bg-background border rounded-lg shadow-lg py-1 w-40">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedPreset(i); setShowPresets(false); }}
                  className={cn(
                    "w-full text-start px-3 py-2 text-xs hover:bg-muted transition-colors",
                    i === selectedPreset && "font-medium text-primary"
                  )}
                >
                  {t(p.label)}
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
          IQD
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
                {t("analytics.tab.live")}
              </span>
            ) : tab === "analytics" ? t("analytics.tab.analytics") : t("analytics.tab.reports")}
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
                label={t("analytics.kpi.grossSales")}
                value={fmtIQD(ov?.grossSales ?? 0)}
                spark={grossSpark}
                isLoading={isLoading}
              />
              <KpiRow
                label={t("analytics.kpi.returningRate")}
                value={`${ov?.returningCustomerRate ?? 0}%`}
                spark={Array(isSingleDay ? 24 : 30).fill(ov?.returningCustomerRate ?? 0)}
                isLoading={isLoading}
              />
              <KpiRow
                label={t("analytics.kpi.ordersFulfilled")}
                value={String(ov?.ordersFulfilled ?? 0)}
                spark={ordSpark}
                isLoading={isLoading}
              />
              <KpiRow
                label={t("analytics.kpi.orders")}
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
          <NoTracking label={t("analytics.section.sessionsOverTime")} />

          {/* Total sales by sales channel — no tracking */}
          <NoTracking label={t("analytics.section.salesByChannel")} />

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
          <NoTracking label={t("analytics.section.sessionsByDevice")} />
          <NoTracking label={t("analytics.section.sessionsByLocation")} />
          <NoTracking label={t("analytics.section.salesBySocial")} />
          <NoTracking label={t("analytics.section.sessionsBySocial")} />
          <NoTracking label={t("analytics.section.sessionsByLanding")} />
          <NoTracking label={t("analytics.section.perfByChannel")} />

          {/* Customer cohort */}
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : ov ? (
            <CustomerCohortTable cohort={ov.cohort} />
          ) : null}

          {/* More no-tracking sections */}
          <NoTracking label={t("analytics.section.sessionsByReferrer")} />
          <NoTracking label={t("analytics.section.salesByPos")} />
          <NoTracking label={t("analytics.section.salesByReferrer")} />

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
    </PageContainer>
  );
}
