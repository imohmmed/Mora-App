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
            Live View
          </h2>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Orders
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Visitors right now
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
          {dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live"}
        </div>
      </div>

      {/* ── Search bar ────────────────────────────────────── */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <Input className="pl-8 h-9 text-sm bg-muted/30 border-muted" placeholder="Search location" readOnly />
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
        <LiveStatCard label="Visitors right now" value="0" />
        <LiveStatCard label="Total sales" value={fmtIQD(totalSales)} accent />
        <LiveStatCard label="Sessions" value="0" />
        <LiveStatCard label="Orders" value={String(orders.length)} accent />
      </div>

      {/* ── Customer behavior ─────────────────────────────── */}
      <div className="bg-background rounded-xl border p-4 shadow-sm">
        <p className="text-sm font-semibold mb-4">Customer behavior</p>
        <div className="grid grid-cols-3 divide-x">
          {[
            { label: "Active carts",  value: pending },
            { label: "Checking out",  value: 0 },
            { label: "Purchased",     value: fulfilled },
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
            { label: "Active carts",  pct: 100, color: "#e0f2fe" },
            { label: "Checking out",  pct: 0,   color: "#bae6fd" },
            { label: "Purchased",     pct: orders.length > 0 ? Math.round((fulfilled / orders.length) * 100) : 0, color: "#38bdf8" },
          ].map(bar => (
            <div key={bar.label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-24 shrink-0">{bar.label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div style={{ width: `${bar.pct}%`, backgroundColor: bar.color, height: "100%", borderRadius: "inherit", transition: "width 0.6s ease" }} />
              </div>
              <span className="w-8 text-right">{bar.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sessions by location ─────────────────────────── */}
      <div className="bg-background rounded-xl border p-4 shadow-sm">
        <p className="text-sm font-semibold mb-3">Sessions by location</p>
        <p className="text-xs text-muted-foreground text-center py-6">No data for this date range</p>
      </div>

      {/* ── New vs returning customers ────────────────────── */}
      <div className="bg-background rounded-xl border p-4 shadow-sm">
        <p className="text-sm font-semibold mb-3">New vs returning customers</p>
        {orders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No data for this date range</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "New",       value: orders.length - Math.min(2, orders.length), color: "#38bdf8" },
              { label: "Returning", value: Math.min(2, orders.length),                 color: "#818cf8" },
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
        <p className="text-sm font-semibold mb-3">Total sales by product</p>
        {orders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No data for this date range</p>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No session tracking — see Analytics tab for product breakdown</p>
        )}
      </div>

      {/* ── Recent orders feed ───────────────────────────── */}
      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold">Recent orders</p>
          <span className="text-[10px] text-muted-foreground">Auto-refresh 30s</span>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-25" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {orders.map(order => {
              const diffMs  = now.getTime() - new Date(order.createdAt).getTime();
              const diffMin = Math.round(diffMs / 60_000);
              const age     = diffMin < 60 ? `${diffMin}m ago` : diffMin < 1440 ? `${Math.round(diffMin / 60)}h ago` : `${Math.round(diffMin / 1440)}d ago`;
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
                  <div className="flex items-center gap-2 text-right shrink-0 ml-2">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium capitalize", statusColor[order.status] ?? "bg-muted text-muted-foreground")}>
                      {order.status}
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
