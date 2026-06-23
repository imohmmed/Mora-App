import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Truck, Trash2, Plus, MapPin, Tag } from "lucide-react";

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

const fmtIqd = (n: number | null | undefined) =>
  n == null ? "—" : `${Number(n).toLocaleString("en-US")} IQD`;

export default function ShippingSettings() {
  const { toast } = useToast();

  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [rules, setRules] = useState<ShippingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingZones, setSavingZones] = useState(false);

  // New governorate form
  const [newGov, setNewGov] = useState({ governorate: "", governorateAr: "", price: "" });
  const [addingGov, setAddingGov] = useState(false);

  // New rule form
  const [newRule, setNewRule] = useState({ textEn: "", textAr: "", threshold: "" });
  const [addingRule, setAddingRule] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [z, r] = await Promise.all([
        api<ShippingZone[]>("/admin/shipping-zones"),
        api<ShippingRule[]>("/admin/shipping-rules"),
      ]);
      setZones((z.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder));
      setRules((r.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder));
    } catch {
      toast({ title: "Error", description: "Failed to load shipping settings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      toast({ title: "Saved", description: "Delivery prices updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save delivery prices.", variant: "destructive" });
    } finally {
      setSavingZones(false);
    }
  };

  const addGovernorate = async () => {
    if (!newGov.governorate.trim()) {
      toast({ title: "Missing name", description: "Enter the governorate name.", variant: "destructive" });
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
      toast({ title: "Governorate added" });
    } catch {
      toast({ title: "Error", description: "Failed to add governorate.", variant: "destructive" });
    } finally {
      setAddingGov(false);
    }
  };

  const deleteZone = async (id: string) => {
    try {
      await api(`/admin/shipping-zones/${id}`, { method: "DELETE" });
      setZones((p) => p.filter((z) => z.id !== id));
      toast({ title: "Governorate removed" });
    } catch {
      toast({ title: "Error", description: "Failed to delete governorate.", variant: "destructive" });
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
      toast({ title: "Rule saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save rule.", variant: "destructive" });
    }
  };

  const addRule = async () => {
    if (!newRule.textEn.trim() && !newRule.textAr.trim()) {
      toast({ title: "Missing text", description: "Enter the rule text shown to customers.", variant: "destructive" });
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
      toast({ title: "Rule added" });
    } catch {
      toast({ title: "Error", description: "Failed to add rule.", variant: "destructive" });
    } finally {
      setAddingRule(false);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await api(`/admin/shipping-rules/${id}`, { method: "DELETE" });
      setRules((p) => p.filter((r) => r.id !== id));
      toast({ title: "Rule deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete rule.", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="p-6 md:p-8">Loading shipping settings...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="w-7 h-7 text-muted-foreground" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping</h1>
          <p className="text-muted-foreground mt-1">
            Set delivery prices per governorate and free-delivery rules.
          </p>
        </div>
      </div>

      {/* A) GOVERNORATE DELIVERY PRICES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Governorate Delivery Prices
          </CardTitle>
          <CardDescription>
            The price charged for delivery to each governorate. Disabled governorates are hidden
            from customers at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Governorate</TableHead>
                  <TableHead>Arabic</TableHead>
                  <TableHead className="w-[180px]">Price (IQD)</TableHead>
                  <TableHead className="w-[100px] text-center">Enabled</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No governorates yet. Add one below.
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((z) => (
                    <TableRow key={z.id}>
                      <TableCell className="font-medium">{z.governorate}</TableCell>
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
              {savingZones ? "Saving..." : "Save prices"}
            </Button>
          </div>

          {/* Add governorate */}
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-3 items-end">
            <div className="grid gap-1.5">
              <Label className="text-xs">Governorate (English)</Label>
              <Input
                value={newGov.governorate}
                onChange={(e) => setNewGov((p) => ({ ...p, governorate: e.target.value }))}
                placeholder="e.g. Baghdad"
                data-testid="input-new-gov-en"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Governorate (Arabic)</Label>
              <Input
                value={newGov.governorateAr}
                onChange={(e) => setNewGov((p) => ({ ...p, governorateAr: e.target.value }))}
                placeholder="مثال: بغداد"
                dir="rtl"
                data-testid="input-new-gov-ar"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Price (IQD)</Label>
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
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* B) SHIPPING RULES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Shipping Rules
          </CardTitle>
          <CardDescription>
            Each rule shows a short message to customers in their language (English &amp; Arabic).
            Optionally set a free-delivery threshold: when an order subtotal reaches it, delivery
            becomes free. Deleting every rule removes all of them — customers will then see no
            shipping messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground">No shipping rules yet. Add one below.</p>
          )}

          {rules.map((r) => (
            <div key={r.id} className="p-4 border rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">English text</Label>
                  <Input
                    value={r.textEn}
                    onChange={(e) => updateRule(r.id, { textEn: e.target.value })}
                    placeholder="Free delivery on orders over 50,000 IQD"
                    data-testid={`input-rule-en-${r.id}`}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Arabic text</Label>
                  <Input
                    value={r.textAr}
                    onChange={(e) => updateRule(r.id, { textAr: e.target.value })}
                    dir="rtl"
                    placeholder="توصيل مجاني للطلبات فوق ٥٠٬٠٠٠ د.ع"
                    data-testid={`input-rule-ar-${r.id}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[200px_auto_1fr] gap-3 items-end">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Free-delivery threshold (IQD)</Label>
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
                    placeholder="Optional"
                    data-testid={`input-rule-threshold-${r.id}`}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm pb-2">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(v) => updateRule(r.id, { enabled: v })}
                    data-testid={`switch-rule-enabled-${r.id}`}
                  />
                  Enabled
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => saveRule(r)} data-testid={`btn-save-rule-${r.id}`}>
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteRule(r.id)}
                    data-testid={`btn-delete-rule-${r.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
              {r.threshold != null && (
                <p className="text-xs text-muted-foreground">
                  Orders of {fmtIqd(r.threshold)} or more qualify for free delivery.
                </p>
              )}
            </div>
          ))}

          {/* Add rule */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Add a rule</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">English text</Label>
                <Input
                  value={newRule.textEn}
                  onChange={(e) => setNewRule((p) => ({ ...p, textEn: e.target.value }))}
                  placeholder="Free delivery on orders over 50,000 IQD"
                  data-testid="input-new-rule-en"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Arabic text</Label>
                <Input
                  value={newRule.textAr}
                  onChange={(e) => setNewRule((p) => ({ ...p, textAr: e.target.value }))}
                  dir="rtl"
                  placeholder="توصيل مجاني للطلبات فوق ٥٠٬٠٠٠ د.ع"
                  data-testid="input-new-rule-ar"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[200px_auto] gap-3 items-end">
              <div className="grid gap-1.5">
                <Label className="text-xs">Free-delivery threshold (IQD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={newRule.threshold}
                  onChange={(e) => setNewRule((p) => ({ ...p, threshold: e.target.value }))}
                  placeholder="Optional"
                  data-testid="input-new-rule-threshold"
                />
              </div>
              <Button variant="outline" onClick={addRule} disabled={addingRule} data-testid="btn-add-rule">
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
