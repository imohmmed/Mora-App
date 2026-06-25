import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BellRing, PackageOpen } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { formatIQD } from "@/lib/format";
import { useT } from "@/i18n/LanguageContext";
import { fetchWantedProducts } from "@/lib/api";

export default function WantedProducts() {
  const { t, lang } = useT();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "wanted-products"],
    queryFn: fetchWantedProducts,
  });

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-IQ" : "en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  return (
    <PageContainer>
      <PageHeader title={t("wanted.title")} subtitle={t("wanted.subtitle")} />

      {/* Desktop table */}
      <div className="hidden md:block bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[72px]">{t("products.col.image")}</TableHead>
              <TableHead>{t("products.col.product")}</TableHead>
              <TableHead className="text-center">{t("wanted.col.pending")}</TableHead>
              <TableHead className="text-center">{t("wanted.col.requests")}</TableHead>
              <TableHead className="text-center">{t("wanted.col.customers")}</TableHead>
              <TableHead>{t("wanted.col.lastRequested")}</TableHead>
              <TableHead className="text-end">{t("common.price")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">{t("common.loading")}</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <BellRing className="h-8 w-8 mb-2 opacity-50" />
                    <p>{t("wanted.empty")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.productId} className="cursor-pointer group relative">
                  <TableCell>
                    <div className="h-11 w-11 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.title ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <PackageOpen className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.title ? (
                      <>
                        <Link href={`/products/${item.productId}`} className="absolute inset-0">
                          <span className="sr-only">{item.title}</span>
                        </Link>
                        {item.title}
                      </>
                    ) : (
                      <span className="text-muted-foreground italic">{t("wanted.deletedProduct")}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.pendingRequests > 0 ? (
                      <Badge variant="default" className="tabular-nums">{item.pendingRequests}</Badge>
                    ) : (
                      <span className="text-muted-foreground tabular-nums">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{item.totalRequests}</TableCell>
                  <TableCell className="text-center tabular-nums">{item.distinctCustomers}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{fmtDate(item.lastRequestedAt)}</TableCell>
                  <TableCell className="text-end font-medium tabular-nums">
                    {item.price != null ? formatIQD(item.price) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BellRing className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{t("wanted.empty")}</p>
          </div>
        ) : (
          items.map((item) => {
            const inner = (
              <Card className="cursor-pointer hover:shadow-sm transition-shadow active:opacity-80">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.title ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <PackageOpen className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.title ?? <span className="text-muted-foreground italic">{t("wanted.deletedProduct")}</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("wanted.col.requests")}: {item.totalRequests} · {t("wanted.col.customers")}: {item.distinctCustomers}
                      </p>
                    </div>
                    <div className="text-end flex-shrink-0">
                      {item.pendingRequests > 0 && (
                        <Badge variant="default" className="text-xs tabular-nums">{item.pendingRequests}</Badge>
                      )}
                      {item.price != null && (
                        <p className="font-semibold tabular-nums mt-1">{formatIQD(item.price)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            return item.title ? (
              <Link key={item.productId} href={`/products/${item.productId}`}>{inner}</Link>
            ) : (
              <div key={item.productId}>{inner}</div>
            );
          })
        )}
      </div>
    </PageContainer>
  );
}
