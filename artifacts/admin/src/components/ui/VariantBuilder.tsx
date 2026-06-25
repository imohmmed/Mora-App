import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, X, Trash2, PencilLine, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type OptionGroup = { name?: string; nameEn?: string; nameAr?: string; values: string[] };

export function optionGroupName(g: OptionGroup): string {
  return (g.nameEn || g.nameAr || g.name || "").trim();
}

export type VariantRow = {
  option1: string | null;
  option2: string | null;
  price: string;
  comparePrice: string;
  sku: string;
  inventory: string;
  cost: string;
};

function cartesian(groups: OptionGroup[]): Array<[string | null, string | null]> {
  const active = groups.filter((g) => optionGroupName(g) && g.values.length > 0);
  if (active.length === 0) return [];
  if (active.length === 1) return active[0].values.map((v) => [v, null]);
  if (active[1]) {
    const pairs: Array<[string | null, string | null]> = [];
    for (const v1 of active[0].values) {
      for (const v2 of active[1].values) {
        const rest = active
          .slice(2)
          .flatMap((g) => g.values)
          .join(" / ");
        pairs.push([v1, rest ? `${v2} / ${rest}` : v2]);
      }
    }
    return pairs;
  }
  return active[0].values.map((v) => [v, null]);
}

export function variantKey(row: { option1: string | null; option2: string | null }) {
  return [row.option1, row.option2].filter(Boolean).join(" / ") || "Default";
}

type BulkFields = {
  price: string;
  comparePrice: string;
  inventory: string;
  sku: string;
  cost: string;
};

interface VariantBuilderProps {
  optionGroups: OptionGroup[];
  onOptionGroupsChange: (groups: OptionGroup[]) => void;
  variants: VariantRow[];
  onVariantsChange: (variants: VariantRow[]) => void;
  basePrice?: string;
}

export function VariantBuilder({
  optionGroups, onOptionGroupsChange, variants, onVariantsChange, basePrice = "",
}: VariantBuilderProps) {
  const [valueInputs, setValueInputs] = useState<string[]>(optionGroups.map(() => ""));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFields, setBulkFields] = useState<BulkFields>({
    price: "", comparePrice: "", inventory: "", sku: "", cost: "",
  });

  const combos = cartesian(optionGroups);

  const updateVariantField = (key: string, field: keyof VariantRow, val: string) => {
    onVariantsChange(variants.map((v) => variantKey(v) === key ? { ...v, [field]: val } : v));
  };

  const syncVariants = (groups: OptionGroup[]) => {
    const newCombos = cartesian(groups);
    if (!newCombos.length) { onVariantsChange([]); setSelected(new Set()); return; }
    const prevMap = new Map(variants.map((v) => [variantKey(v), v]));
    const next: VariantRow[] = newCombos.map(([o1, o2]) => {
      const k = [o1, o2].filter(Boolean).join(" / ") || "Default";
      return prevMap.get(k) ?? {
        option1: o1, option2: o2, price: basePrice, comparePrice: "", sku: "", inventory: "0", cost: "",
      };
    });
    onVariantsChange(next);
    setSelected(new Set());
  };

  const addGroup = () => {
    if (optionGroups.length >= 3) return;
    const next = [...optionGroups, { nameEn: "", nameAr: "", values: [] }];
    onOptionGroupsChange(next);
    setValueInputs([...valueInputs, ""]);
    syncVariants(next);
  };

  const removeGroup = (i: number) => {
    const next = optionGroups.filter((_, idx) => idx !== i);
    const nextInputs = valueInputs.filter((_, idx) => idx !== i);
    onOptionGroupsChange(next);
    setValueInputs(nextInputs);
    syncVariants(next);
  };

  const setGroupField = (i: number, field: "nameEn" | "nameAr", value: string) => {
    const next = optionGroups.map((g, idx) => (idx === i ? { ...g, [field]: value } : g));
    onOptionGroupsChange(next);
    syncVariants(next);
  };

  const addValue = (i: number) => {
    const val = valueInputs[i].trim();
    if (!val || optionGroups[i].values.includes(val)) return;
    const next = optionGroups.map((g, idx) =>
      idx === i ? { ...g, values: [...g.values, val] } : g
    );
    onOptionGroupsChange(next);
    setValueInputs(valueInputs.map((v, idx) => (idx === i ? "" : v)));
    syncVariants(next);
  };

  const removeValue = (gi: number, val: string) => {
    const next = optionGroups.map((g, idx) =>
      idx === gi ? { ...g, values: g.values.filter((v) => v !== val) } : g
    );
    onOptionGroupsChange(next);
    syncVariants(next);
  };

  const allKeys = variants.map(variantKey);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allKeys));
  };

  const toggleRow = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const applyBulk = () => {
    const updated = variants.map((v) => {
      if (!selected.has(variantKey(v))) return v;
      const next = { ...v };
      if (bulkFields.price.trim() !== "") next.price = bulkFields.price.trim();
      if (bulkFields.comparePrice.trim() !== "") next.comparePrice = bulkFields.comparePrice.trim();
      if (bulkFields.inventory.trim() !== "") next.inventory = bulkFields.inventory.trim();
      if (bulkFields.sku.trim() !== "") next.sku = bulkFields.sku.trim();
      if (bulkFields.cost.trim() !== "") next.cost = bulkFields.cost.trim();
      return next;
    });
    onVariantsChange(updated);
    setBulkOpen(false);
    setBulkFields({ price: "", comparePrice: "", inventory: "", sku: "", cost: "" });
  };

  const hasCombos = combos.length > 0;

  return (
    <div className="space-y-4">
      {optionGroups.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Add options like size or color
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addGroup}>
            <Plus className="w-4 h-4 mr-2" />
            Add option
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {optionGroups.map((group, gi) => (
              <div key={gi} className="border rounded-lg p-4 space-y-3 bg-muted/10">
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Name (English)</Label>
                      <Input
                        dir="ltr"
                        placeholder="e.g. Size, Color"
                        value={group.nameEn ?? ""}
                        onChange={(e) => setGroupField(gi, "nameEn", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">الاسم (عربي)</Label>
                      <Input
                        dir="rtl"
                        placeholder="مثال: القياس، اللون"
                        value={group.nameAr ?? ""}
                        onChange={(e) => setGroupField(gi, "nameAr", e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-5 text-muted-foreground hover:text-destructive"
                    onClick={() => removeGroup(gi)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Option values</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {group.values.map((val) => (
                      <Badge key={val} variant="secondary" className="gap-1 pr-1">
                        {val}
                        <button
                          type="button"
                          onClick={() => removeValue(gi, val)}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a value, then press Enter"
                      value={valueInputs[gi] ?? ""}
                      onChange={(e) =>
                        setValueInputs((prev) =>
                          prev.map((v, idx) => (idx === gi ? e.target.value : v))
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addValue(gi); }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => addValue(gi)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {optionGroups.length < 3 && (
            <Button type="button" variant="ghost" size="sm" onClick={addGroup} className="text-muted-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add another option
            </Button>
          )}
        </>
      )}

      {hasCombos && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {variants.length} variant{variants.length !== 1 ? "s" : ""}
            </p>
            <Button
              type="button"
              variant={someSelected ? "default" : "outline"}
              size="sm"
              disabled={!someSelected}
              onClick={() => { setBulkOpen(true); }}
              className="gap-1.5 text-xs h-8"
            >
              <PencilLine className="w-3.5 h-3.5" />
              Bulk edit{someSelected ? ` (${selected.size})` : ""}
            </Button>
          </div>

          {bulkOpen && (
            <div className="border rounded-lg p-4 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  Edit {selected.size} selected variant{selected.size !== 1 ? "s" : ""}
                </p>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setBulkOpen(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Only filled fields will be updated — leave blank to keep existing value.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Price (IQD)</Label>
                  <Input
                    type="number" min="0" step="1" placeholder="e.g. 25000"
                    className="h-8 text-sm"
                    value={bulkFields.price}
                    onChange={(e) => setBulkFields((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Compare Price (IQD)</Label>
                  <Input
                    type="number" min="0" step="1" placeholder="e.g. 35000"
                    className="h-8 text-sm"
                    value={bulkFields.comparePrice}
                    onChange={(e) => setBulkFields((f) => ({ ...f, comparePrice: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stock</Label>
                  <Input
                    type="number" min="0" step="1" placeholder="e.g. 10"
                    className="h-8 text-sm"
                    value={bulkFields.inventory}
                    onChange={(e) => setBulkFields((f) => ({ ...f, inventory: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cost (IQD)</Label>
                  <Input
                    type="number" min="0" step="1" placeholder="e.g. 12000"
                    className="h-8 text-sm"
                    value={bulkFields.cost}
                    onChange={(e) => setBulkFields((f) => ({ ...f, cost: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">SKU</Label>
                  <Input
                    placeholder="e.g. SHIRT-BLK-M"
                    className="h-8 text-sm font-mono"
                    value={bulkFields.sku}
                    onChange={(e) => setBulkFields((f) => ({ ...f, sku: e.target.value }))}
                  />
                </div>
              </div>
              <Button type="button" size="sm" className="gap-1.5 text-xs" onClick={applyBulk}>
                <Check className="w-3.5 h-3.5" />
                Apply to {selected.size} variant{selected.size !== 1 ? "s" : ""}
              </Button>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm" style={{ minWidth: "600px", width: "100%" }}>
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        className="rounded cursor-pointer"
                        checked={allSelected}
                        onChange={toggleAll}
                        title="Select all"
                      />
                    </th>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Variant</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap w-28">Price (IQD)</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap w-32">Compare (IQD)</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap w-20">Stock</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap w-28">Cost (IQD)</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap w-24">Margin</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap w-32">SKU</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {variants.map((v) => {
                    const key = variantKey(v);
                    const isSelected = selected.has(key);
                    return (
                      <tr
                        key={key}
                        className={cn("hover:bg-muted/20 transition-colors", isSelected && "bg-primary/5")}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            className="rounded cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleRow(key)}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-sm whitespace-nowrap">{key}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number" step="1" min="0"
                            className="h-8 text-right text-xs w-28"
                            value={v.price}
                            onChange={(e) => updateVariantField(key, "price", e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number" step="1" min="0"
                            className="h-8 text-right text-xs w-32"
                            placeholder="—"
                            value={v.comparePrice}
                            onChange={(e) => updateVariantField(key, "comparePrice", e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number" min="0"
                            className="h-8 text-right text-xs w-20"
                            value={v.inventory}
                            onChange={(e) => updateVariantField(key, "inventory", e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number" step="1" min="0"
                            className="h-8 text-right text-xs w-28"
                            placeholder="—"
                            value={v.cost}
                            onChange={(e) => updateVariantField(key, "cost", e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {(() => {
                            const p = parseFloat(v.price) || 0;
                            const c = parseFloat(v.cost) || 0;
                            if (!v.cost || !v.price || p === 0) return <span className="text-xs text-muted-foreground">—</span>;
                            const margin = ((p - c) / p) * 100;
                            const color = margin >= 50 ? "text-green-600" : margin >= 30 ? "text-amber-600" : "text-red-600";
                            return <span className={`text-xs font-semibold ${color}`}>{margin.toFixed(1)}%</span>;
                          })()}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            className="h-8 text-xs w-32 font-mono"
                            placeholder="SKU"
                            value={v.sku}
                            onChange={(e) => updateVariantField(key, "sku", e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
