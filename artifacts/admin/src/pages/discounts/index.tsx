import { useAdminListDiscounts } from "@workspace/api-client-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/page-primitives";
import { Tags, Plus } from "lucide-react";
import { fmt } from "@/lib/date";
import { formatIQD } from "@/lib/format";
import { useLocation } from "wouter";
import { useT } from "@/i18n/LanguageContext";

export default function Discounts() {
  const [, navigate] = useLocation();
  const { t } = useT();
  const { data: response, isLoading } = useAdminListDiscounts();
  const discounts = response?.data ?? [];

  const statusLabel = (s: string) => {
    const key = `discounts.status.${s}`;
    const translated = t(key);
    return translated === key ? s : translated;
  };

  const statusVariant = (s: string) =>
    s === "active" ? "default" : s === "scheduled" ? "outline" : "secondary";

  const valueLabel = (discount: any) =>
    discount.type === "free_shipping"
      ? t("discounts.freeShipping")
      : discount.type === "percentage"
      ? t("discounts.percentOff", { value: discount.value })
      : t("discounts.amountOff", { value: formatIQD(discount.value) });

  return (
    <PageContainer>
      <PageHeader
        title={t("discounts.title")}
        subtitle={t("discounts.subtitle")}
        actions={
          <Button data-testid="btn-add-discount" onClick={() => navigate("/discounts/new")}>
            <Plus className="w-4 h-4 me-2" />
            {t("discounts.create")}
          </Button>
        }
      />

      {/* Desktop table */}
      <div className="hidden md:block bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("discounts.col.code")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("discounts.col.typeValue")}</TableHead>
                <TableHead>{t("discounts.col.usage")}</TableHead>
                <TableHead>{t("discounts.col.activeDates")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">{t("common.loading")}</TableCell>
                </TableRow>
              ) : discounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Tags className="h-8 w-8 mb-2 opacity-50" />
                      <p>{t("discounts.empty")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                discounts.map((discount: any) => (
                  <TableRow key={discount.id} className="cursor-pointer">
                    <TableCell className="font-semibold font-mono">{discount.code}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(discount.status)}>
                        {statusLabel(discount.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span>{t(`discounts.type.${discount.type}`)}</span>
                      {" · "}
                      <span className="font-medium">{valueLabel(discount)}</span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {discount.usageCount ?? 0}
                      {discount.usageLimit ? ` / ${discount.usageLimit}` : ` ${t("discounts.used")}`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {discount.startsAt ? fmt(discount.startsAt, "MMM d") : "—"}
                      {discount.endsAt ? ` – ${fmt(discount.endsAt, "MMM d, yyyy")}` : ""}
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
        ) : discounts.length === 0 ? (
          <EmptyState icon={Tags} title={t("discounts.emptyMobile")} />
        ) : (
          discounts.map((discount: any) => (
            <Card key={discount.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold font-mono">{discount.code}</span>
                  <Badge variant={statusVariant(discount.status)}>
                    {statusLabel(discount.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {discount.type === "free_shipping"
                    ? t("discounts.freeShipping")
                    : discount.type === "percentage"
                    ? t("discounts.percentOff", { value: discount.value })
                    : t("discounts.amountOff", { value: formatIQD(discount.value) })}
                  {" · "}
                  {discount.usageCount ?? 0}{discount.usageLimit ? `/${discount.usageLimit}` : ""} {t("discounts.used")}
                </p>
                {discount.startsAt && (
                  <p className="text-xs text-muted-foreground">
                    {fmt(discount.startsAt, "MMM d")}
                    {discount.endsAt ? ` – ${fmt(discount.endsAt, "MMM d, yyyy")}` : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
