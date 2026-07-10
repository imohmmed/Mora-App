import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageContainer, PageHeader, SectionCard } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, MapPin, Tag, Truck } from "lucide-react";
import { formatIQD } from "@/lib/format";
import { useT } from "@/i18n/LanguageContext";

type DeliveryOptionsConfig = {
  standard: { enabled: boolean };
  express: { enabled: boolean; price: number };
  pickup: { enabled: boolean };
};

type ShippingZone = {
  id: string;
  governorate: string;
  governorateAr: string;
  price: number;
  sortOrder: number;
  enabled: boolean;
};

type ShippingRule = {
  id: string;
  textEn: string;
  textAr: string;
  threshold: number | null;
  enabled: boolean;
  sortOrder: number;
};

async function api<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T; error: string | null }> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
      ...(options?.headers ?? {}),
    },
  });
  return res.json();
}

export default function ShippingSettings() {
  const { t } = useT();
  const { toast } = useToast();

  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [rules, setRules] = useState<ShippingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingZones, setSavingZones] = useState(false);

  const [deliveryOptions, setDeliveryOptionsState] = useState<DeliveryOptionsConfig>({
    standard: { enabled: true }, express: { enabled: true, price: 9000 }, pickup: { enabled: true },
  });
  const [savingDeliveryOptions, setSavingDeliveryOptions] = useState(false);

  // New governorate form
  const [newGov, setNewGov] = useState({ governorate: "", governorateAr: "", price: "" });
  const [addingGov, setAddingGov] = useState(false);

  // New rule form
  const [newRule, setNewRule] = useState({ textEn: "", textAr: "", threshold: "" });
  const [addingRule, setAddingRule] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [z, r, d] = await Promise.all([
        api<ShippingZone[]>("/admin/shipping-zones"),
        api<ShippingRule[]>("/admin/shipping-rules"),
        api<DeliveryOptionsConfig>("/admin/delivery-options"),
      ]);
      setZones((z.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder));
      setRules((r.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder));
      if (d.data) setDeliveryOptionsState(d.data);
    } catch {
      toast({ title: t("toast.error"), description: t("shipping.toast.loadError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Zones ──────────────────────────────────────────────────────────────────
  const updateZone = (id: string, patch: Partial<ShippingZone>) =>
    setZones((p) => p.map((z) => (z.id === id ? { ...z, ...patch } : z)));

  const saveZones = async () => {
    setSavingZones(true);
    try {
      const res = await api<ShippingZone[]>("/admin/shipping-zones", {
        method: "PUT",
        body: JSON.stringify({
          zones: zones.map((z) => ({
            id: z.id,
            price: Number(z.price) || 0,
            enabled: z.enabled,
            governorateAr: z.governorateAr,
          })),
        }),
      });
      setZones((res.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder));
      toast({ title: t("toast.saved"), description: t("shipping.toast.pricesSaved") });
    } catch {
      toast({ title: t("toast.error"), description: t("shipping.toast.pricesSavedError"), variant: "destructive" });
    } finally {
      setSavingZones(false);
    }
  };

  const addGovernorate = async () => {
    if (!newGov.governorate.trim()) {
      toast({ title: t("shipping.toast.missingName.title"), description: t("shipping.toast.missingName.desc"), variant: "destructive" });
      return;
    }
    setAddingGov(true);
    try {
      await api("/admin/shipping-zones", {
        method: "POST",
        body: JSON.stringify({
          governorate: newGov.governorate.trim(),
          governorateAr: newGov.governorateAr.trim(),
          price: Number(newGov.price) || 0,
          enabled: true,
        }),
      });
      setNewGov({ governorate: "", governorateAr: "", price: "" });
      await loadAll();
      toast({ title: t("shipping.toast.govAdded") });
    } catch {
      toast({ title: t("toast.error"), description: t("shipping.toast.govAddError"), variant: "destructive" });
    } finally {
      setAddingGov(false);
    }
  };

  const deleteZone = async (id: string) => {
    try {
      await api(`/admin/shipping-zones/${id}`, { method: "DELETE" });
      setZones((p) => p.filter((z) => z.id !== id));
      toast({ title: t("shipping.toast.govRemoved") });
    } catch {
      toast({ title: t("toast.error"), description: t("shipping.toast.govDeleteError"), variant: "destructive" });
    }
  };

  // ─── Delivery options ───────────────────────────────────────────────────────
  const updateDeliveryOptions = (patch: Partial<DeliveryOptionsConfig>) =>
    setDeliveryOptionsState((p) => ({ ...p, ...patch }));

  const saveDeliveryOptions = async () => {
    setSavingDeliveryOptions(true);
    try {
      const res = await api<DeliveryOptionsConfig>("/admin/delivery-options", {
        method: "PUT",
        body: JSON.stringify(deliveryOptions),
      });
      if (res.data) setDeliveryOptionsState(res.data);
      toast({ title: t("toast.saved") });
    } catch {
      toast({ title: t("toast.error"), variant: "destructive" });
    } finally {
      setSavingDeliveryOptions(false);
    }
  };

  // ─── Rules ──────────────────────────────────────────────────────────────────
  const updateRule = (id: string, patch: Partial<ShippingRule>) =>
    setRules((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const saveRule = async (rule: ShippingRule) => {
    try {
      await api(`/admin/shipping-rules/${rule.id}`, {
        method: "PUT",
        body: JSON.stringify({
          textEn: rule.textEn,
          textAr: rule.textAr,
          threshold: rule.threshold,
          enabled: rule.enabled,
        }),
      });
      toast({ title: t("shipping.toast.ruleSaved") });
    } catch {
      toast({ title: t("toast.error"), description: t("shipping.toast.ruleSaveError"), variant: "destructive" });
    }
  };

  const addRule = async () => {
    if (!newRule.textEn.trim() && !newRule.textAr.trim()) {
      toast({ title: t("shipping.toast.missingText.title"), description: t("shipping.toast.missingText.desc"), variant: "destructive" });
      return;
    }
    setAddingRule(true);
    try {
      const thresholdRaw = newRule.threshold.trim();
      await api("/admin/shipping-rules", {
        method: "POST",
        body: JSON.stringify({
          textEn: newRule.textEn.trim(),
          textAr: newRule.textAr.trim(),
          threshold: thresholdRaw === "" ? null : Number(thresholdRaw),
          enabled: true,
        }),
      });
      setNewRule({ textEn: "", textAr: "", threshold: "" });
      await loadAll();
      toast({ title: t("shipping.toast.ruleAdded") });
    } catch {
      toast({ title: t("toast.error"), description: t("shipping.toast.ruleAddError"), variant: "destructive" });
    } finally {
      setAddingRule(false);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await api(`/admin/shipping-rules/${id}`, { method: "DELETE" });
      setRules((p) => p.filter((r) => r.id !== id));
      toast({ title: t("shipping.toast.ruleDeleted") });
    } catch {
      toast({ title: t("toast.error"), description: t("shipping.toast.ruleDeleteError"), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <PageContainer className="max-w-4xl">
        <p className="text-muted-foreground">{t("shipping.loading")}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title={t("nav.shipping")} subtitle={t("shipping.subtitle")} />

      {/* DELIVERY OPTIONS (express / standard / pickup toggles) */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            خيارات التوصيل
          </span>
        }
        description="فعّل أو أخفِ أي طريقة توصيل، وحدد سعر التوصيل السريع"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium">توصيل عادي</Label>
                <Switch
                  checked={deliveryOptions.standard.enabled}
                  onCheckedChange={(v) => updateDeliveryOptions({ standard: { enabled: v } })}
                  data-testid="switch-delivery-standard"
                />
              </div>
              <p className="text-xs text-muted-foreground">حسب سعر المحافظة</p>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium">توصيل سريع</Label>
                <Switch
                  checked={deliveryOptions.express.enabled}
                  onCheckedChange={(v) => updateDeliveryOptions({ express: { ...deliveryOptions.express, enabled: v } })}
                  data-testid="switch-delivery-express"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">السعر الثابت (دينار)</Label>
                <Input
                  type="number"
                  min="0"
                  step="500"
                  value={deliveryOptions.express.price}
                  onChange={(e) => updateDeliveryOptions({ express: { ...deliveryOptions.express, price: parseFloat(e.target.value) || 0 } })}
                  className="tabular-nums"
                  data-testid="input-delivery-express-price"
                />
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium">استلام من المحل</Label>
                <Switch
                  checked={deliveryOptions.pickup.enabled}
                  onCheckedChange={(v) => updateDeliveryOptions({ pickup: { enabled: v } })}
                  data-testid="switch-delivery-pickup"
                />
              </div>
              <p className="text-xs text-muted-foreground">مجاني دائماً</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveDeliveryOptions} disabled={savingDeliveryOptions} data-testid="btn-save-delivery-options">
              {savingDeliveryOptions ? t("action.saving") : t("action.save")}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* A) GOVERNORATE DELIVERY PRICES */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t("shipping.zones.title")}
          </span>
        }
        description={t("shipping.zones.desc")}
      >
        <div className="space-y-4">
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t("shipping.zones.col.governorate")}</TableHead>
                  <TableHead className="text-start">{t("shipping.zones.col.arabic")}</TableHead>
                  <TableHead className="w-[180px] text-start">{t("shipping.zones.col.price")}</TableHead>
                  <TableHead className="w-[100px] text-center">{t("shipping.zones.col.enabled")}</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {t("shipping.zones.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((z) => (
                    <TableRow key={z.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span dir="rtl">{z.governorateAr || z.governorate}</span>
                          <span className="text-xs text-muted-foreground">{z.governorate}</span>
                        </div>
                      </TableCell>
                      <TableCell dir="rtl" className="text-muted-foreground">
                        <Input
                          value={z.governorateAr}
                          onChange={(e) => updateZone(z.id, { governorateAr: e.target.value })}
                          dir="rtl"
                          data-testid={`input-zone-ar-${z.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="250"
                          value={z.price}
                          onChange={(e) => updateZone(z.id, { price: parseFloat(e.target.value) || 0 })}
                          className="tabular-nums"
                          data-testid={`input-zone-price-${z.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={z.enabled}
                          onCheckedChange={(v) => updateZone(z.id, { enabled: v })}
                          data-testid={`switch-zone-enabled-${z.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteZone(z.id)}
                          data-testid={`btn-delete-zone-${z.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveZones} disabled={savingZones} data-testid="btn-save-zones">
              {savingZones ? t("action.saving") : t("shipping.zones.savePrices")}
            </Button>
          </div>

          {/* Add governorate */}
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-3 items-end">
            <div className="grid gap-1.5">
              <Label className="text-xs">{t("shipping.add.govEn")}</Label>
              <Input
                value={newGov.governorate}
                onChange={(e) => setNewGov((p) => ({ ...p, governorate: e.target.value }))}
                placeholder={t("shipping.add.govEnPlaceholder")}
                data-testid="input-new-gov-en"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">{t("shipping.add.govAr")}</Label>
              <Input
                value={newGov.governorateAr}
                onChange={(e) => setNewGov((p) => ({ ...p, governorateAr: e.target.value }))}
                placeholder={t("shipping.add.govArPlaceholder")}
                dir="rtl"
                data-testid="input-new-gov-ar"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">{t("shipping.add.price")}</Label>
              <Input
                type="number"
                min="0"
                step="250"
                value={newGov.price}
                onChange={(e) => setNewGov((p) => ({ ...p, price: e.target.value }))}
                placeholder="5000"
                data-testid="input-new-gov-price"
              />
            </div>
            <Button variant="outline" onClick={addGovernorate} disabled={addingGov} data-testid="btn-add-gov">
              <Plus className="w-4 h-4 me-2" />
              {t("action.add")}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* B) SHIPPING RULES */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {t("shipping.rules.title")}
          </span>
        }
        description={t("shipping.rules.desc")}
      >
        <div className="space-y-4">
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("shipping.rules.empty")}</p>
          )}

          {rules.map((r) => (
            <div key={r.id} className="p-4 border rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">{t("shipping.rules.englishText")}</Label>
                  <Input
                    value={r.textEn}
                    onChange={(e) => updateRule(r.id, { textEn: e.target.value })}
                    placeholder={t("shipping.rules.enPlaceholder")}
                    data-testid={`input-rule-en-${r.id}`}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">{t("shipping.rules.arabicText")}</Label>
                  <Input
                    value={r.textAr}
                    onChange={(e) => updateRule(r.id, { textAr: e.target.value })}
                    dir="rtl"
                    placeholder={t("shipping.rules.arPlaceholder")}
                    data-testid={`input-rule-ar-${r.id}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[200px_auto_1fr] gap-3 items-end">
                <div className="grid gap-1.5">
                  <Label className="text-xs">{t("shipping.rules.threshold")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={r.threshold ?? ""}
                    onChange={(e) =>
                      updateRule(r.id, {
                        threshold: e.target.value === "" ? null : parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder={t("shipping.rules.thresholdOptional")}
                    data-testid={`input-rule-threshold-${r.id}`}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm pb-2">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(v) => updateRule(r.id, { enabled: v })}
                    data-testid={`switch-rule-enabled-${r.id}`}
                  />
                  {t("common.enabled")}
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => saveRule(r)} data-testid={`btn-save-rule-${r.id}`}>
                    {t("action.save")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteRule(r.id)}
                    data-testid={`btn-delete-rule-${r.id}`}
                  >
                    <Trash2 className="w-4 h-4 me-2" />
                    {t("action.delete")}
                  </Button>
                </div>
              </div>
              {r.threshold != null && (
                <p className="text-xs text-muted-foreground">
                  {t("shipping.rules.qualifies", { amount: formatIQD(r.threshold) })}
                </p>
              )}
            </div>
          ))}

          {/* Add rule */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">{t("shipping.rules.add")}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">{t("shipping.rules.englishText")}</Label>
                <Input
                  value={newRule.textEn}
                  onChange={(e) => setNewRule((p) => ({ ...p, textEn: e.target.value }))}
                  placeholder={t("shipping.rules.enPlaceholder")}
                  data-testid="input-new-rule-en"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">{t("shipping.rules.arabicText")}</Label>
                <Input
                  value={newRule.textAr}
                  onChange={(e) => setNewRule((p) => ({ ...p, textAr: e.target.value }))}
                  dir="rtl"
                  placeholder={t("shipping.rules.arPlaceholder")}
                  data-testid="input-new-rule-ar"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[200px_auto] gap-3 items-end">
              <div className="grid gap-1.5">
                <Label className="text-xs">{t("shipping.rules.threshold")}</Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={newRule.threshold}
                  onChange={(e) => setNewRule((p) => ({ ...p, threshold: e.target.value }))}
                  placeholder={t("shipping.rules.thresholdOptional")}
                  data-testid="input-new-rule-threshold"
                />
              </div>
              <Button variant="outline" onClick={addRule} disabled={addingRule} data-testid="btn-add-rule">
                <Plus className="w-4 h-4 me-2" />
                {t("shipping.rules.addRule")}
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>
    </PageContainer>
  );
}
