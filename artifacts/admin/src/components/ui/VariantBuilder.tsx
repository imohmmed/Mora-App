import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, X, Trash2, PencilLine, Check, Palette, AlignJustify, User, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ColorEntry = { nameEn: string; nameAr: string; hex: string };
export type ModelEntry = { id: string; nameEn: string; nameAr: string; image: string };

export type OptionGroup = {
  name?: string;
  nameEn?: string;
  nameAr?: string;
  values: string[];
  type?: "variant" | "color" | "model";
  colorEntries?: ColorEntry[];
  modelEntries?: ModelEntry[];
};

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

  // Full cartesian product across all active groups
  let combos: string[][] = [[]];
  for (const group of active) {
    combos = combos.flatMap((combo) => group.values.map((v) => [...combo, v]));
  }

  // Encode: option1 = first group value, option2 = rest joined by " / "
  return combos.map((combo) => {
    const [o1, ...rest] = combo;
    return [o1 ?? null, rest.length > 0 ? rest.join(" / ") : null];
  });
}

/** Decode a variant's value for group gi given total number of active groups */
function getVariantGroupValue(v: VariantRow, gi: number, total: number): string | null {
  if (gi === 0) return v.option1 ?? null;
  if (gi === 1) return total <= 2 ? (v.option2 ?? null) : (v.option2?.split(" / ")[0] ?? null);
  if (gi === 2) return v.option2?.split(" / ").slice(1).join(" / ") ?? null;
  return null;
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
  images?: string[];
}

export function VariantBuilder({
  optionGroups, onOptionGroupsChange, variants, onVariantsChange, basePrice = "", images = [],
}: VariantBuilderProps) {
  const [valueInputs, setValueInputs] = useState<string[]>(optionGroups.map(() => ""));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [modelPickerFor, setModelPickerFor] = useState<string | null>(null);
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

  const addVariantGroup = () => {
    if (optionGroups.length >= 3) return;
    const next = [...optionGroups, { nameEn: "", nameAr: "", values: [], type: "variant" as const }];
    onOptionGroupsChange(next);
    setValueInputs([...valueInputs, ""]);
    syncVariants(next);
  };

  const addColorGroup = () => {
    if (optionGroups.length >= 3) return;
    const next = [...optionGroups, { nameEn: "Color", nameAr: "اللون", values: [], type: "color" as const, colorEntries: [] }];
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

  const setColorEntryField = (gi: number, ci: number, field: keyof ColorEntry, value: string) => {
    const next = optionGroups.map((g, idx) => {
      if (idx !== gi || !g.colorEntries) return g;
      const newEntries = g.colorEntries.map((c, cIdx) =>
        cIdx === ci ? { ...c, [field]: value } : c
      );
      return { ...g, colorEntries: newEntries, values: newEntries.map((c) => c.nameEn || c.hex) };
    });
    onOptionGroupsChange(next);
    syncVariants(next);
  };

  const addColorEntry = (gi: number) => {
    const next = optionGroups.map((g, idx) => {
      if (idx !== gi) return g;
      const newEntry: ColorEntry = { nameEn: "", nameAr: "", hex: "#000000" };
      const newEntries = [...(g.colorEntries ?? []), newEntry];
      return { ...g, colorEntries: newEntries, values: newEntries.map((c) => c.nameEn || c.hex) };
    });
    onOptionGroupsChange(next);
    syncVariants(next);
  };

  const removeColorEntry = (gi: number, ci: number) => {
    const next = optionGroups.map((g, idx) => {
      if (idx !== gi || !g.colorEntries) return g;
      const newEntries = g.colorEntries.filter((_, cIdx) => cIdx !== ci);
      return { ...g, colorEntries: newEntries, values: newEntries.map((c) => c.nameEn || c.hex) };
    });
    onOptionGroupsChange(next);
    syncVariants(next);
  };

  const addModelGroup = () => {
    if (optionGroups.length >= 3) return;
    const next = [...optionGroups, { nameEn: "Models", nameAr: "الموديلات", values: [], type: "model" as const, modelEntries: [] }];
    onOptionGroupsChange(next);
    setValueInputs([...valueInputs, ""]);
    syncVariants(next);
  };

  /** Only include model entries that have a real name — unnamed entries don't generate variants yet */
  const modelValues = (entries: ModelEntry[]) =>
    entries.filter((m) => m.nameEn.trim()).map((m) => m.nameEn.trim());

  const addModelEntry = (gi: number) => {
    const next = optionGroups.map((g, idx) => {
      if (idx !== gi) return g;
      const newEntry: ModelEntry = { id: `m_${Date.now()}`, nameEn: "", nameAr: "", image: "" };
      const newEntries = [...(g.modelEntries ?? []), newEntry];
      return { ...g, modelEntries: newEntries, values: modelValues(newEntries) };
    });
    onOptionGroupsChange(next);
    syncVariants(next);
  };

  const updateModelEntry = (gi: number, id: string, patch: Partial<ModelEntry>) => {
    const next = optionGroups.map((g, idx) => {
      if (idx !== gi || !g.modelEntries) return g;
      const newEntries = g.modelEntries.map((m) => m.id === id ? { ...m, ...patch } : m);
      return { ...g, modelEntries: newEntries, values: modelValues(newEntries) };
    });
    onOptionGroupsChange(next);
    syncVariants(next);
  };

  const removeModelEntry = (gi: number, id: string) => {
    const next = optionGroups.map((g, idx) => {
      if (idx !== gi || !g.modelEntries) return g;
      const newEntries = g.modelEntries.filter((m) => m.id !== id);
      return { ...g, modelEntries: newEntries, values: modelValues(newEntries) };
    });
    onOptionGroupsChange(next);
    syncVariants(next);
    if (modelPickerFor) setModelPickerFor(null);
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

  /** Toggle-select all variants where group gi equals value */
  const quickSelect = (gi: number, value: string) => {
    const matching = variants
      .filter((v) => getVariantGroupValue(v, gi, optionGroups.length) === value)
      .map(variantKey);
    const allMatch = matching.length > 0 && matching.every((k) => selected.has(k));
    const next = new Set(selected);
    if (allMatch) matching.forEach((k) => next.delete(k));
    else matching.forEach((k) => next.add(k));
    setSelected(next);
  };

  /** Quick-select all variants for a group's value AND open bulk edit */
  const quickSelectAndEdit = (gi: number, value: string) => {
    const matching = variants
      .filter((v) => getVariantGroupValue(v, gi, optionGroups.length) === value)
      .map(variantKey);
    setSelected(new Set(matching));
    setBulkOpen(true);
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

  const getColorHex = (optionIdx: number, value: string): string | null => {
    const group = optionGroups[optionIdx];
    if (group?.type !== "color" || !group.colorEntries) return null;
    return group.colorEntries.find((c) => c.nameEn === value || c.hex === value)?.hex ?? null;
  };

  return (
    <div className="space-y-4">
      {optionGroups.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Add options like size, color, or models
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button type="button" variant="outline" size="sm" onClick={addVariantGroup}>
              <AlignJustify className="w-4 h-4 mr-2" />
              Add variant
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addColorGroup}>
              <Palette className="w-4 h-4 mr-2" />
              Add color
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addModelGroup}>
              <User className="w-4 h-4 mr-2" />
              Add models
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {optionGroups.map((group, gi) => (
              <div key={gi} className="border rounded-lg p-4 space-y-3 bg-muted/10">
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">
                        {group.type === "color" ? "Color option name (EN)" : group.type === "model" ? "Section name (EN)" : "Name (English)"}
                      </Label>
                      <Input
                        dir="ltr"
                        placeholder={group.type === "color" ? "Color" : group.type === "model" ? "Models" : "e.g. Size, Color"}
                        value={group.nameEn ?? ""}
                        onChange={(e) => setGroupField(gi, "nameEn", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">
                        {group.type === "color" ? "اسم خيار اللون (عربي)" : group.type === "model" ? "اسم القسم (عربي)" : "الاسم (عربي)"}
                      </Label>
                      <Input
                        dir="rtl"
                        placeholder={group.type === "color" ? "اللون" : group.type === "model" ? "الموديلات" : "مثال: القياس، اللون"}
                        value={group.nameAr ?? ""}
                        onChange={(e) => setGroupField(gi, "nameAr", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-5">
                    {group.type === "color" && (
                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded px-1.5 py-0.5 font-medium">
                        Color
                      </span>
                    )}
                    {group.type === "model" && (
                      <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded px-1.5 py-0.5 font-medium">
                        Models
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeGroup(gi)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Values section */}
                {group.type === "color" ? (
                  <div>
                    <Label className="text-xs mb-2 block">Colors</Label>
                    <div className="space-y-2 mb-3">
                      {(group.colorEntries ?? []).map((entry, ci) => (
                        <div key={ci} className="flex items-center gap-2">
                          <div className="relative w-9 h-9 shrink-0 cursor-pointer">
                            <input
                              type="color"
                              value={entry.hex}
                              onChange={(e) => setColorEntryField(gi, ci, "hex", e.target.value)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              title="Pick color"
                            />
                            <div
                              className="w-9 h-9 rounded-full border-2 border-muted shadow-sm pointer-events-none"
                              style={{ backgroundColor: entry.hex }}
                            />
                          </div>
                          <Input
                            dir="ltr"
                            placeholder="Name (EN) e.g. Black"
                            value={entry.nameEn}
                            onChange={(e) => setColorEntryField(gi, ci, "nameEn", e.target.value)}
                            className="h-8 text-sm flex-1"
                          />
                          <Input
                            dir="rtl"
                            placeholder="الاسم مثلاً أسود"
                            value={entry.nameAr}
                            onChange={(e) => setColorEntryField(gi, ci, "nameAr", e.target.value)}
                            className="h-8 text-sm flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeColorEntry(gi, ci)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addColorEntry(gi)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add color
                    </Button>
                  </div>
                ) : group.type === "model" ? (
                  <div className="space-y-3">
                    <Label className="text-xs mb-1 block">Models</Label>
                    {(group.modelEntries ?? []).map((model, mi) => (
                      <div key={model.id} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Model {mi + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeModelEntry(gi, model.id)}
                            className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-3 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Name (EN)</Label>
                              <Input
                                placeholder="e.g. Ahmed"
                                value={model.nameEn}
                                onChange={(e) => updateModelEntry(gi, model.id, { nameEn: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">الاسم (AR)</Label>
                              <Input
                                dir="rtl"
                                placeholder="مثال: أحمد"
                                value={model.nameAr}
                                onChange={(e) => updateModelEntry(gi, model.id, { nameAr: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Model photo</Label>
                            <button
                              type="button"
                              onClick={() => setModelPickerFor(modelPickerFor === model.id ? null : model.id)}
                              className="w-full flex items-center gap-3 border rounded-lg p-2 hover:bg-muted/40 transition-colors text-start"
                            >
                              {model.image ? (
                                <img src={model.image} alt="" className="w-10 h-12 object-cover rounded-md shrink-0" />
                              ) : (
                                <div className="w-10 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                                  <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                                </div>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {model.image
                                  ? modelPickerFor === model.id ? "Hide picker" : "Change photo"
                                  : images.length === 0
                                    ? "Upload product images first"
                                    : "Select from product images"}
                              </span>
                            </button>
                            {modelPickerFor === model.id && (
                              <div className="border rounded-xl p-3 bg-muted/20 mt-2">
                                {images.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-2">
                                    No images yet — add product images in the Media section above first
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-4 gap-2">
                                    {images.map((url, ii) => (
                                      <button
                                        key={ii}
                                        type="button"
                                        onClick={() => {
                                          updateModelEntry(gi, model.id, { image: url });
                                          setModelPickerFor(null);
                                        }}
                                        className="relative rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
                                      >
                                        <img src={url} alt={`Image ${ii + 1}`} className="w-full aspect-[3/4] object-cover" />
                                        <div className={`absolute inset-0 border-2 rounded-lg transition-colors ${model.image === url ? "border-primary" : "border-transparent hover:border-muted-foreground/40"}`} />
                                        {model.image === url && (
                                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                          </div>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addModelEntry(gi)}
                      className="w-full gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add model
                    </Button>
                  </div>
                ) : (
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
                )}
              </div>
            ))}
          </div>

          {optionGroups.length < 3 && (
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddMenuOpen((v) => !v)}
                className="text-muted-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add another option
              </Button>
              {addMenuOpen && (
                <div className="absolute left-0 top-full mt-1 z-20 bg-background border rounded-lg shadow-lg py-1 w-48">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 text-left"
                    onClick={() => { addVariantGroup(); setAddMenuOpen(false); }}
                  >
                    <AlignJustify className="w-4 h-4 text-muted-foreground" />
                    Add variant
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 text-left"
                    onClick={() => { addColorGroup(); setAddMenuOpen(false); }}
                  >
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    Add color
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 text-left"
                    onClick={() => { addModelGroup(); setAddMenuOpen(false); }}
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    Add models
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {hasCombos && (
        <div className="space-y-2">
          {/* ── Header: count + Bulk edit button ── */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {variants.length} variant{variants.length !== 1 ? "s" : ""}
              {someSelected && (
                <span className="ml-2 text-xs text-muted-foreground">({selected.size} selected)</span>
              )}
            </p>
            <Button
              type="button"
              variant={someSelected ? "default" : "outline"}
              size="sm"
              onClick={() => setBulkOpen((o) => !o)}
              className="gap-1.5 text-xs h-8"
            >
              <PencilLine className="w-3.5 h-3.5" />
              Bulk edit{someSelected ? ` (${selected.size})` : ""}
            </Button>
          </div>

          {/* ── Quick-select filter chips ── */}
          {optionGroups.some((g) => g.values.length > 0) && (
            <div className="border rounded-lg px-3 py-2.5 bg-muted/5 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick select by
              </p>
              {optionGroups.map((group, gi) => {
                if (group.values.length === 0) return null;
                const groupLabel = optionGroupName(group) || (group.type === "model" ? "Model" : group.type === "color" ? "Color" : "Size");
                return (
                  <div key={gi} className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[48px]">{groupLabel}:</span>
                    {group.values.map((val) => {
                      const matching = variants.filter(
                        (v) => getVariantGroupValue(v, gi, optionGroups.length) === val,
                      );
                      const allMatch = matching.length > 0 && matching.every((v) => selected.has(variantKey(v)));
                      const colorEntry = group.type === "color"
                        ? (group.colorEntries ?? []).find((c) => c.nameEn === val || c.hex === val)
                        : null;
                      const modelEntry = group.type === "model"
                        ? (group.modelEntries ?? []).find((m) => m.nameEn === val || m.id === val)
                        : null;
                      const displayName = modelEntry
                        ? (modelEntry.nameEn || modelEntry.nameAr || val)
                        : colorEntry ? (colorEntry.nameEn || val) : val;
                      return (
                        <div key={val} className="flex items-center">
                          <button
                            type="button"
                            onClick={() => quickSelect(gi, val)}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-0.5 rounded-l border text-xs font-medium transition-colors",
                              allMatch
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted border-border",
                            )}
                          >
                            {colorEntry?.hex && (
                              <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colorEntry.hex }} />
                            )}
                            {displayName}
                            <span className="opacity-50 text-[10px]">({matching.length})</span>
                          </button>
                          <button
                            type="button"
                            title={`Select & edit all ${displayName}`}
                            onClick={() => quickSelectAndEdit(gi, val)}
                            className="px-1.5 py-[3px] rounded-r border border-l-0 border-border bg-background hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <PencilLine className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Bulk edit panel ── */}
          {bulkOpen && (
            <div className="border rounded-lg bg-muted/10 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Bulk Edit
                    {someSelected
                      ? ` — ${selected.size} variant${selected.size !== 1 ? "s" : ""} selected`
                      : " — select variants above first"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Leave a field blank to keep each variant&apos;s existing value.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground ml-4 shrink-0"
                  onClick={() => setBulkOpen(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-5">
                {/* Pricing */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">💰 Pricing</p>
                  <div className="grid grid-cols-3 gap-3">
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
                      <Label className="text-xs">Cost (IQD)</Label>
                      <Input
                        type="number" min="0" step="1" placeholder="e.g. 12000"
                        className="h-8 text-sm"
                        value={bulkFields.cost}
                        onChange={(e) => setBulkFields((f) => ({ ...f, cost: e.target.value }))}
                      />
                    </div>
                  </div>
                  {bulkFields.price && bulkFields.cost && parseFloat(bulkFields.price) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Margin:{" "}
                      <span className={(() => {
                        const m = ((parseFloat(bulkFields.price) - parseFloat(bulkFields.cost)) / parseFloat(bulkFields.price)) * 100;
                        return m >= 50 ? "text-green-600 font-semibold" : m >= 30 ? "text-amber-600 font-semibold" : "text-red-600 font-semibold";
                      })()}>
                        {(((parseFloat(bulkFields.price) - parseFloat(bulkFields.cost)) / parseFloat(bulkFields.price)) * 100).toFixed(1)}%
                      </span>
                    </p>
                  )}
                </div>

                {/* Stock & SKU */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📦 Stock & SKU</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Stock Quantity</Label>
                      <Input
                        type="number" min="0" step="1" placeholder="e.g. 10"
                        className="h-8 text-sm"
                        value={bulkFields.inventory}
                        onChange={(e) => setBulkFields((f) => ({ ...f, inventory: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SKU</Label>
                      <Input
                        placeholder="e.g. SHIRT-BLK-M"
                        className="h-8 text-sm font-mono"
                        value={bulkFields.sku}
                        onChange={(e) => setBulkFields((f) => ({ ...f, sku: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t">
                  <Button
                    type="button" size="sm" className="gap-1.5 text-xs"
                    disabled={!someSelected}
                    onClick={applyBulk}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply to {selected.size} variant{selected.size !== 1 ? "s" : ""}
                  </Button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    onClick={() => {
                      setBulkOpen(false);
                      setBulkFields({ price: "", comparePrice: "", inventory: "", sku: "", cost: "" });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
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
                    const hex1 = v.option1 ? getColorHex(0, v.option1) : null;
                    const hex2 = v.option2 ? getColorHex(1, v.option2) : null;
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
                        <td className="px-3 py-2 font-medium text-sm whitespace-nowrap">
                          <span className="flex items-center gap-2">
                            {hex1 && (
                              <span
                                className="w-4 h-4 rounded-full border border-muted shrink-0 inline-block"
                                style={{ backgroundColor: hex1 }}
                              />
                            )}
                            {hex2 && (
                              <span
                                className="w-4 h-4 rounded-full border border-muted shrink-0 inline-block"
                                style={{ backgroundColor: hex2 }}
                              />
                            )}
                            {key}
                          </span>
                        </td>
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
