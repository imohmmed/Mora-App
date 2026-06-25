import { useState } from "react";
import { useAdminCreateDiscount } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { getAdminToken } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { formatIQD } from "@/lib/format";
import { useT } from "@/i18n/LanguageContext";

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function NewDiscount() {
  const [, navigate] = useLocation();
  const { t } = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createDiscount = useAdminCreateDiscount();

  const [form, setForm] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed" | "free_shipping",
    value: "",
    hasLimit: false,
    usageLimit: "",
    hasMinSubtotal: false,
    minSubtotal: "",
    hasMinItems: false,
    minItems: "",
    hasMaxDiscount: false,
    maxDiscount: "",
    hasEnd: false,
    endsAt: "",
  });

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isFreeShipping = form.type === "free_shipping";
    const value = isFreeShipping ? 0 : parseFloat(form.value);
    if (!form.code || (!isFreeShipping && (isNaN(value) || value <= 0))) {
      toast({ title: t("discounts.toast.missing"), description: t("discounts.toast.missing.desc"), variant: "destructive" });
      return;
    }
    if (form.type === "percentage" && value > 100) {
      toast({ title: t("discounts.toast.invalid"), description: t("discounts.toast.invalid.desc"), variant: "destructive" });
      return;
    }

    const payload = {
      code: form.code.toUpperCase(),
      type: form.type,
      value,
      usageLimit: form.hasLimit && form.usageLimit ? parseInt(form.usageLimit, 10) : null,
      minSubtotal: form.hasMinSubtotal && form.minSubtotal ? parseFloat(form.minSubtotal) : null,
      minItems: form.hasMinItems && form.minItems ? parseInt(form.minItems, 10) : null,
      maxDiscount: form.type === "percentage" && form.hasMaxDiscount && form.maxDiscount ? parseFloat(form.maxDiscount) : null,
      endsAt: form.hasEnd && form.endsAt ? form.endsAt : null,
    };

    const onCreated = () => {
      toast({ title: t("discounts.toast.created") });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discounts"] });
      navigate("/discounts");
    };
    const onFail = () =>
      toast({ title: t("toast.error"), description: t("discounts.toast.failed"), variant: "destructive" });

    // The generated client's enum is limited to percentage/fixed, so free_shipping
    // is sent via a raw fetch to avoid the strict type rejection.
    if (isFreeShipping) {
      setSubmitting(true);
      fetch("/api/admin/discounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const json = await res.json().catch(() => ({}));
          if (!res.ok || json?.error) throw new Error(json?.error || "Failed");
          onCreated();
        })
        .catch(onFail)
        .finally(() => setSubmitting(false));
      return;
    }

    createDiscount.mutate(
      { data: payload as Parameters<typeof createDiscount.mutate>[0]["data"] },
      { onSuccess: onCreated, onError: onFail }
    );
  };

  const preview =
    form.type === "free_shipping"
      ? t("discounts.freeShipping")
      : form.value
      ? form.type === "percentage"
        ? t("discounts.percentOff", { value: form.value })
        : t("discounts.amountOff", { value: formatIQD(parseFloat(form.value || "0")) })
      : "—";

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/discounts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{t("discounts.create")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("discounts.new.codeCard")}</CardTitle>
              <CardDescription>{t("discounts.new.codeCard.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="code">{t("discounts.new.code")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    placeholder={t("discounts.new.code.placeholder")}
                    value={form.code}
                    onChange={(e) => set("code", e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => set("code", randomCode())}
                    title={t("discounts.new.generate")}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("discounts.new.valueCard")}</CardTitle>
              <CardDescription>{t("discounts.new.valueCard.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>{t("discounts.new.type")}</Label>
                <Select value={form.type} onValueChange={(v: "percentage" | "fixed" | "free_shipping") => set("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t("discounts.new.type.percentage")}</SelectItem>
                    <SelectItem value="fixed">{t("discounts.new.type.fixed")}</SelectItem>
                    <SelectItem value="free_shipping">{t("discounts.new.type.free_shipping")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.type === "free_shipping" ? (
                <p className="text-sm text-muted-foreground">
                  {t("discounts.new.freeShipping.desc")}
                </p>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="value">
                    {form.type === "percentage" ? t("discounts.new.percentLabel") : t("discounts.new.amountLabel")}
                  </Label>
                  <div className="relative">
                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {form.type === "percentage" ? "%" : "IQD"}
                    </span>
                    <Input
                      id="value"
                      type="number"
                      step={form.type === "percentage" ? "1" : "250"}
                      min="0"
                      max={form.type === "percentage" ? "100" : undefined}
                      className={form.type === "percentage" ? "ps-8" : "ps-12"}
                      placeholder={form.type === "percentage" ? t("discounts.new.percent.placeholder") : t("discounts.new.amount.placeholder")}
                      value={form.value}
                      onChange={(e) => set("value", e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
              {form.type === "percentage" && (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hasMaxDiscount">{t("discounts.new.cap")}</Label>
                    <Switch
                      id="hasMaxDiscount"
                      checked={form.hasMaxDiscount}
                      onCheckedChange={(v) => set("hasMaxDiscount", v)}
                    />
                  </div>
                  {form.hasMaxDiscount && (
                    <div className="relative">
                      <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">IQD</span>
                      <Input
                        type="number"
                        min="0"
                        step="250"
                        className="ps-12"
                        placeholder={t("discounts.new.cap.placeholder")}
                        value={form.maxDiscount}
                        onChange={(e) => set("maxDiscount", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("discounts.new.conditionsCard")}</CardTitle>
              <CardDescription>{t("discounts.new.conditionsCard.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasMinSubtotal">{t("discounts.new.minSubtotal")}</Label>
                <Switch
                  id="hasMinSubtotal"
                  checked={form.hasMinSubtotal}
                  onCheckedChange={(v) => set("hasMinSubtotal", v)}
                />
              </div>
              {form.hasMinSubtotal && (
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">IQD</span>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    className="ps-12"
                    placeholder={t("discounts.new.minSubtotal.placeholder")}
                    value={form.minSubtotal}
                    onChange={(e) => set("minSubtotal", e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <Label htmlFor="hasMinItems">{t("discounts.new.minItems")}</Label>
                <Switch
                  id="hasMinItems"
                  checked={form.hasMinItems}
                  onCheckedChange={(v) => set("hasMinItems", v)}
                />
              </div>
              {form.hasMinItems && (
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder={t("discounts.new.minItems.placeholder")}
                  value={form.minItems}
                  onChange={(e) => set("minItems", e.target.value)}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("discounts.new.usageCard")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasLimit">{t("discounts.new.usageLimit")}</Label>
                <Switch
                  id="hasLimit"
                  checked={form.hasLimit}
                  onCheckedChange={(v) => set("hasLimit", v)}
                />
              </div>
              {form.hasLimit && (
                <Input
                  type="number"
                  min="1"
                  placeholder={t("discounts.new.usageLimit.placeholder")}
                  value={form.usageLimit}
                  onChange={(e) => set("usageLimit", e.target.value)}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("discounts.new.datesCard")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasEnd">{t("discounts.new.setEnd")}</Label>
                <Switch
                  id="hasEnd"
                  checked={form.hasEnd}
                  onCheckedChange={(v) => set("hasEnd", v)}
                />
              </div>
              {form.hasEnd && (
                <div className="grid gap-2">
                  <Label>{t("discounts.new.endDate")}</Label>
                  <Input
                    type="date"
                    value={form.endsAt}
                    onChange={(e) => set("endsAt", e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar — summary */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader><CardTitle>{t("discounts.new.summary")}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("discounts.col.code")}</span>
                <span className="font-mono font-semibold">{form.code || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("discounts.new.summary.value")}</span>
                <span className="font-semibold">{preview}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("discounts.new.summary.usageLimit")}</span>
                <span>{form.hasLimit ? (form.usageLimit || "—") : t("discounts.new.summary.unlimited")}</span>
              </div>
              {form.type === "percentage" && form.hasMaxDiscount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("discounts.new.summary.maxDiscount")}</span>
                  <span>{form.maxDiscount ? formatIQD(parseFloat(form.maxDiscount)) : "—"}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("discounts.new.summary.minSubtotal")}</span>
                <span>{form.hasMinSubtotal ? (form.minSubtotal ? formatIQD(parseFloat(form.minSubtotal)) : "—") : t("discounts.new.summary.none")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("discounts.new.summary.minItems")}</span>
                <span>{form.hasMinItems ? (form.minItems || "—") : t("discounts.new.summary.none")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("discounts.new.summary.ends")}</span>
                <span>{form.hasEnd ? (form.endsAt || "—") : t("discounts.new.summary.noEnd")}</span>
              </div>
              <div className="pt-3 border-t space-y-2">
                <Button type="submit" disabled={createDiscount.isPending || submitting} className="w-full">
                  {createDiscount.isPending || submitting ? t("action.saving") : t("discounts.create")}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/discounts")}>
                  {t("action.cancel")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
