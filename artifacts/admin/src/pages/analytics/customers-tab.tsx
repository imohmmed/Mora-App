import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Palette, AlertTriangle, ShoppingCart, Search, Tag } from "lucide-react";
import { useT } from "@/i18n/LanguageContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

// ─── Types (mirror api-server getCustomersAnalytics) ─────────────────────────

type CustomersData = {
  wishlist: {
    totalAdds: number;
    uniqueUsers: number;
    topWishlisted: { productId: string; title: string; wishlistCount: number; adds: number; uniqueUsers: number; purchases: number; conversionRate: number }[];
  };
  sizeColor: {
    bestSize: { size: string; units: number } | null;
    worstSize: { size: string; units: number } | null;
    sizesSold: { size: string; units: number }[];
    bestColor: { color: string; units: number } | null;
    colorsSold: { color: string; units: number }[];
    colorsViewed: { color: string; views: number }[];
    mostViewedColor: { color: string; views: number } | null;
  };
  inventory: {
    outOfStockCount: number;
    lowStockCount: number;
    needsReorderCount: number;
    outOfStock: InvRow[];
    lowStock: InvRow[];
    needsReorder: InvRow[];
    velocityTop: InvRow[];
  };
  cart: {
    cartsCreated: number;
    cartsPurchased: number;
    cartsAbandoned: number;
    abandonmentRate: number;
    avgCartValue: number;
    mostAbandoned: { productId: string; title: string; count: number }[];
  };
  search: {
    totalSearches: number;
    topSearches: { query: string; count: number; results: number }[];
    zeroResultSearches: { query: string; count: number }[];
    topClicked: { productId: string; title: string; clicks: number }[];
    purchaseRateAfterSearch: number;
    searchSessions: number;
  };
  coupons: {
    mostUsed: { code: string; usageCount: number; orders: number; revenue: number } | null;
    couponUsageRate: number;
    salesWithDiscount: number;
    salesWithoutDiscount: number;
    ordersWithDiscount: number;
    ordersWithoutDiscount: number;
    couponImpact: { code: string; usageCount: number; orders: number; revenue: number }[];
  };
};

type InvRow = { productId: string; title: string; stock: number; sold30: number; velocity: number; daysLeft: number | null };

const fmtIQD = (n: number) => `${Math.round(n).toLocaleString("en-US")} IQD`;

// ─── Small building blocks ────────────────────────────────────────────────────

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 text-center">
      <p className="text-[11px] text-muted-foreground mb-1 leading-tight">{label}</p>
      <p className={`text-lg font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function EmptyNote() {
  const { t } = useT();
  return <p className="text-xs text-muted-foreground text-center py-6">{t("analytics.cust.noData")}</p>;
}

function SectionCard({ icon: Icon, title, children }: { icon: typeof Heart; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function MiniTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b">
            {headers.map((h, i) => (
              <th key={h + i} className={`py-2 font-medium ${i === 0 ? "text-start" : "text-end"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td key={ci} className={`py-2 ${ci === 0 ? "text-start font-medium max-w-[180px] truncate" : "text-end text-muted-foreground"}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// Horizontal recharts bar chart, matching the analytics page style
function HBarChart({
  data, color = "#2196F3", unit, height,
}: {
  data: { name: string; value: number }[]; color?: string; unit?: string; height?: number;
}) {
  const h = height ?? Math.max(120, data.length * 34 + 20);
  return (
    <div style={{ height: h }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v: number) => [unit ? `${v}${unit}` : String(v), ""]}
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={1 - i * 0.06} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Vertical grouped bar chart (e.g. sales with vs without discount)
function VBarChart({ data, color = "#2196F3", height = 160, tickFormatter }: {
  data: { name: string; value: number }[]; color?: string; height?: number; tickFormatter?: (v: number) => string;
}) {
  return (
    <div style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={tickFormatter} allowDecimals={false} />
          <Tooltip
            formatter={(v: number) => [tickFormatter ? tickFormatter(v) : String(v), ""]}
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function CustomersTab() {
  const { t } = useT();
  const { data: res, isLoading } = useQuery({
    queryKey: ["analytics-customers"],
    queryFn: () => adminFetch<CustomersData>("/admin/analytics/customers"),
    refetchInterval: 60_000,
  });
  const d = res?.data;

  if (isLoading || !d) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Wishlist ── */}
      <SectionCard icon={Heart} title={t("analytics.cust.wishlist.title")}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label={t("analytics.cust.wishlist.totalAdds")} value={String(d.wishlist.totalAdds)} accent />
          <StatBox label={t("analytics.cust.wishlist.uniqueUsers")} value={String(d.wishlist.uniqueUsers)} />
        </div>
        {d.wishlist.topWishlisted.length === 0 ? <EmptyNote /> : (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.wishlist.top")}</p>
            <HBarChart
              data={d.wishlist.topWishlisted.slice(0, 6).map(w => ({ name: w.title, value: w.adds }))}
              color="#38bdf8"
            />
            <p className="text-xs font-semibold mb-2 mt-4">{t("analytics.cust.wishlist.col.conv")}</p>
            <HBarChart
              data={d.wishlist.topWishlisted.slice(0, 6).map(w => ({ name: w.title, value: w.conversionRate }))}
              color="#818cf8"
              unit="%"
            />
            <MiniTable
              headers={[t("analytics.col.product"), t("analytics.cust.wishlist.col.adds"), t("analytics.cust.wishlist.col.users"), t("analytics.cust.wishlist.col.purchases"), t("analytics.cust.wishlist.col.conv")]}
              rows={d.wishlist.topWishlisted.map(w => [w.title, w.adds, w.uniqueUsers, w.purchases, `${w.conversionRate}%`])}
            />
          </div>
        )}
      </SectionCard>

      {/* ── Sizes & Colors ── */}
      <SectionCard icon={Palette} title={t("analytics.cust.sizeColor.title")}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label={t("analytics.cust.sizeColor.bestSize")} value={d.sizeColor.bestSize ? d.sizeColor.bestSize.size : "—"} accent />
          <StatBox label={t("analytics.cust.sizeColor.worstSize")} value={d.sizeColor.worstSize ? d.sizeColor.worstSize.size : "—"} />
          <StatBox label={t("analytics.cust.sizeColor.bestColor")} value={d.sizeColor.bestColor ? d.sizeColor.bestColor.color : "—"} accent />
          <StatBox label={t("analytics.cust.sizeColor.mostViewedColor")} value={d.sizeColor.mostViewedColor ? d.sizeColor.mostViewedColor.color : "—"} />
        </div>
        {d.sizeColor.sizesSold.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.sizeColor.sizesSold")}</p>
            <HBarChart data={d.sizeColor.sizesSold.slice(0, 8).map(s => ({ name: s.size, value: s.units }))} color="#38bdf8" />
          </div>
        )}
        {d.sizeColor.colorsSold.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.sizeColor.colorsSold")}</p>
            <HBarChart data={d.sizeColor.colorsSold.slice(0, 8).map(c => ({ name: c.color, value: c.units }))} color="#818cf8" />
          </div>
        )}
        {d.sizeColor.colorsViewed.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.sizeColor.mostViewedColor")}</p>
            <HBarChart data={d.sizeColor.colorsViewed.slice(0, 8).map(c => ({ name: c.color, value: c.views }))} color="#34d399" />
          </div>
        )}
        {d.sizeColor.sizesSold.length === 0 && d.sizeColor.colorsSold.length === 0 && <EmptyNote />}
      </SectionCard>

      {/* ── Inventory risk ── */}
      <SectionCard icon={AlertTriangle} title={t("analytics.cust.inventory.title")}>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label={t("analytics.cust.inventory.outOfStock")} value={String(d.inventory.outOfStockCount)} />
          <StatBox label={t("analytics.cust.inventory.lowStock")} value={String(d.inventory.lowStockCount)} />
          <StatBox label={t("analytics.cust.inventory.needsReorder")} value={String(d.inventory.needsReorderCount)} accent />
        </div>
        {d.inventory.needsReorder.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.inventory.needsReorder")}</p>
            <MiniTable
              headers={[t("analytics.col.product"), t("analytics.cust.inventory.col.stock"), t("analytics.cust.inventory.col.sold30"), t("analytics.cust.inventory.col.daysLeft")]}
              rows={d.inventory.needsReorder.map(p => [p.title, p.stock, p.sold30, p.daysLeft ?? "—"])}
            />
          </div>
        )}
        {d.inventory.lowStock.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.inventory.lowStock")}</p>
            <MiniTable
              headers={[t("analytics.col.product"), t("analytics.cust.inventory.col.stock"), t("analytics.cust.inventory.col.sold30")]}
              rows={d.inventory.lowStock.map(p => [p.title, p.stock, p.sold30])}
            />
          </div>
        )}
        {d.inventory.velocityTop.filter(p => p.velocity > 0).length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.inventory.velocity")}</p>
            <MiniTable
              headers={[t("analytics.col.product"), t("analytics.cust.inventory.col.perDay"), t("analytics.cust.inventory.col.stock")]}
              rows={d.inventory.velocityTop.filter(p => p.velocity > 0).map(p => [p.title, p.velocity, p.stock])}
            />
          </div>
        )}
      </SectionCard>

      {/* ── Cart behavior ── */}
      <SectionCard icon={ShoppingCart} title={t("analytics.cust.cart.title")}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label={t("analytics.cust.cart.created")} value={String(d.cart.cartsCreated)} />
          <StatBox label={t("analytics.cust.cart.purchased")} value={String(d.cart.cartsPurchased)} accent />
          <StatBox label={t("analytics.cust.cart.abandoned")} value={String(d.cart.cartsAbandoned)} />
          <StatBox label={t("analytics.cust.cart.abandonRate")} value={`${d.cart.abandonmentRate}%`} />
        </div>
        <StatBox label={t("analytics.cust.cart.avgValue")} value={fmtIQD(d.cart.avgCartValue)} accent />
        {d.cart.cartsCreated > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.cart.abandonRate")}</p>
            <VBarChart
              data={[
                { name: t("analytics.cust.cart.created"), value: d.cart.cartsCreated },
                { name: t("analytics.cust.cart.abandoned"), value: d.cart.cartsAbandoned },
                { name: t("analytics.cust.cart.purchased"), value: d.cart.cartsPurchased },
              ]}
              color="#38bdf8"
            />
          </div>
        )}
        {d.cart.mostAbandoned.length === 0 ? <EmptyNote /> : (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.cart.mostAbandoned")}</p>
            <HBarChart data={d.cart.mostAbandoned.slice(0, 6).map(p => ({ name: p.title, value: p.count }))} color="#f87171" />
          </div>
        )}
      </SectionCard>

      {/* ── Search behavior ── */}
      <SectionCard icon={Search} title={t("analytics.cust.search.title")}>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label={t("analytics.cust.search.total")} value={String(d.search.totalSearches)} accent />
          <StatBox label={t("analytics.cust.search.sessions")} value={String(d.search.searchSessions)} />
          <StatBox label={t("analytics.cust.search.purchaseRate")} value={`${d.search.purchaseRateAfterSearch}%`} />
        </div>
        {d.search.topSearches.length === 0 ? <EmptyNote /> : (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.search.top")}</p>
            <HBarChart data={d.search.topSearches.slice(0, 8).map(s => ({ name: s.query, value: s.count }))} color="#38bdf8" />
            <MiniTable
              headers={["", t("analytics.cust.search.col.count"), t("analytics.cust.search.col.results")]}
              rows={d.search.topSearches.map(s => [s.query, s.count, s.results])}
            />
          </div>
        )}
        {d.search.zeroResultSearches.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.search.zero")}</p>
            <MiniTable
              headers={["", t("analytics.cust.search.col.count")]}
              rows={d.search.zeroResultSearches.map(s => [s.query, s.count])}
            />
          </div>
        )}
        {d.search.topClicked.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.search.clicked")}</p>
            <MiniTable
              headers={[t("analytics.col.product"), t("analytics.cust.search.col.clicks")]}
              rows={d.search.topClicked.map(s => [s.title, s.clicks])}
            />
          </div>
        )}
      </SectionCard>

      {/* ── Discount codes ── */}
      <SectionCard icon={Tag} title={t("analytics.cust.coupons.title")}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label={t("analytics.cust.coupons.mostUsed")} value={d.coupons.mostUsed ? d.coupons.mostUsed.code : "—"} accent />
          <StatBox label={t("analytics.cust.coupons.usageRate")} value={`${d.coupons.couponUsageRate}%`} />
          <StatBox label={t("analytics.cust.coupons.salesWith")} value={fmtIQD(d.coupons.salesWithDiscount)} />
          <StatBox label={t("analytics.cust.coupons.salesWithout")} value={fmtIQD(d.coupons.salesWithoutDiscount)} />
        </div>
        {(d.coupons.salesWithDiscount > 0 || d.coupons.salesWithoutDiscount > 0) && (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.coupons.usageRate")}</p>
            <VBarChart
              data={[
                { name: t("analytics.cust.coupons.salesWith"), value: d.coupons.salesWithDiscount },
                { name: t("analytics.cust.coupons.salesWithout"), value: d.coupons.salesWithoutDiscount },
              ]}
              color="#818cf8"
              tickFormatter={v => `${Math.round(v / 1000)}k`}
            />
          </div>
        )}
        {d.coupons.couponImpact.length === 0 ? <EmptyNote /> : (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.coupons.impact")}</p>
            <HBarChart data={d.coupons.couponImpact.slice(0, 6).map(c => ({ name: c.code, value: c.orders }))} color="#38bdf8" />
            <MiniTable
              headers={[t("analytics.cust.coupons.col.code"), t("analytics.cust.coupons.col.uses"), t("analytics.cust.coupons.col.orders"), t("analytics.cust.coupons.col.revenue")]}
              rows={d.coupons.couponImpact.map(c => [c.code, c.usageCount, c.orders, fmtIQD(c.revenue)])}
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
