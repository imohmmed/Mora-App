import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Palette, AlertTriangle, ShoppingCart, Search, Tag } from "lucide-react";
import { useT } from "@/i18n/LanguageContext";

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

function BarList({ items, unitLabel }: { items: { label: string; value: number }[]; unitLabel: (n: number) => string }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map(it => (
        <div key={it.label} className="flex items-center gap-2 text-xs">
          <span className="w-20 shrink-0 truncate font-medium">{it.label}</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div style={{ width: `${(it.value / max) * 100}%`, backgroundColor: "#38bdf8", height: "100%", borderRadius: "inherit" }} />
          </div>
          <span className="w-20 text-end text-muted-foreground shrink-0">{unitLabel(it.value)}</span>
        </div>
      ))}
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
            <BarList items={d.sizeColor.sizesSold.map(s => ({ label: s.size, value: s.units }))} unitLabel={n => t("analytics.cust.units", { n })} />
          </div>
        )}
        {d.sizeColor.colorsSold.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.sizeColor.colorsSold")}</p>
            <BarList items={d.sizeColor.colorsSold.map(c => ({ label: c.color, value: c.units }))} unitLabel={n => t("analytics.cust.units", { n })} />
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
        {d.cart.mostAbandoned.length === 0 ? <EmptyNote /> : (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.cart.mostAbandoned")}</p>
            <MiniTable
              headers={[t("analytics.col.product"), t("analytics.cust.cart.col.times")]}
              rows={d.cart.mostAbandoned.map(p => [p.title, p.count])}
            />
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
        {d.coupons.couponImpact.length === 0 ? <EmptyNote /> : (
          <div>
            <p className="text-xs font-semibold mb-2">{t("analytics.cust.coupons.impact")}</p>
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
