import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type OptionGroup = { name: string; values: string[] };

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
  const active = groups.filter((g) => g.name.trim() && g.values.length > 0);
  if (active.length === 0) return [];
  if (active.length === 1) return active[0].values.map((v) => [v, null]);
  const extra = active
    .slice(1)
    .flatMap((g) => g.values)
    .join(" / ");
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

  const combos = cartesian(optionGroups);

  const updateVariantField = (key: string, field: keyof VariantRow, val: string) => {
    const updated = variants.map((v) =>
      variantKey(v) === key ? { ...v, [field]: val } : v
    );
    onVariantsChange(updated);
  };

  const syncVariants = (groups: OptionGroup[]) => {
    const newCombos = cartesian(groups);
    if (!newCombos.length) { onVariantsChange([]); return; }
    const prevMap = new Map(variants.map((v) => [variantKey(v), v]));
    const next: VariantRow[] = newCombos.map(([o1, o2]) => {
      const k = [o1, o2].filter(Boolean).join(" / ") || "Default";
      return prevMap.get(k) ?? {
        option1: o1, option2: o2, price: basePrice, comparePrice: "", sku: "", inventory: "0", cost: "",
      };
    });
    onVariantsChange(next);
  };

  const addGroup = () => {
    if (optionGroups.length >= 3) return;
    const next = [...optionGroups, { name: "", values: [] }];
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

  const setGroupName = (i: number, name: string) => {
    const next = optionGroups.map((g, idx) => (idx === i ? { ...g, name } : g));
    onOptionGroupsChange(next);
    syncVariants(next);
  };

  const addValue = (i: number) => {
    const val = valueInputs[i].trim();
    if (!val || optionGroups[i].values.includes(val)) return;
    const next = optionGroups.map((g, idx) =>
      idx === i ? { ...g, values: [...g.values, val] } : g
    );
    const nextInputs = valueInputs.map((v, idx) => (idx === i ? "" : v));
    onOptionGroupsChange(next);
    setValueInputs(nextInputs);
    syncVariants(next);
  };

  const removeValue = (gi: number, val: string) => {
    const next = optionGroups.map((g, idx) =>
      idx === gi ? { ...g, values: g.values.filter((v) => v !== val) } : g
    );
    onOptionGroupsChange(next);
    syncVariants(next);
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
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">Option name</Label>
                    <Input
                      placeholder="e.g. Size, Color, Material"
                      value={group.name}
                      onChange={(e) => setGroupName(gi, e.target.value)}
                    />
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
          <p className="text-sm font-medium">
            {variants.length} variant{variants.length !== 1 ? "s" : ""}
          </p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-medium">Variant</th>
                  <th className="text-right px-3 py-2 font-medium w-28">Price (IQD)</th>
                  <th className="text-right px-3 py-2 font-medium w-20">Stock</th>
                  <th className="text-right px-3 py-2 font-medium w-32">SKU</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {variants.map((v) => {
                  const key = variantKey(v);
                  return (
                    <tr key={key} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-sm">{key}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          className="h-8 text-right text-xs w-28"
                          value={v.price}
                          onChange={(e) => updateVariantField(key, "price", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-right text-xs w-20"
                          value={v.inventory}
                          onChange={(e) => updateVariantField(key, "inventory", e.target.value)}
                        />
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
      )}
    </div>
  );
}
