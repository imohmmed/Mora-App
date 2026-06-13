import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Image as ImageIcon, Wand2, Users,
  ChevronDown, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Condition = { id: string; field: string; operator: string; value: string };

type CollectionData = {
  id?: string;
  title: string;
  description: string;
  image: string;
  backgroundImage: string;
  collectionType: "manual" | "smart";
  conditionsMatch: "all" | "any";
  conditions: Condition[];
};

type Product = {
  id: string; title: string; vendor: string; price: number; images: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELDS = [
  { value: "title",         label: "Title",                kind: "text" },
  { value: "category",      label: "Category",             kind: "text" },
  { value: "vendor",        label: "Vendor",               kind: "text" },
  { value: "tag",           label: "Tag",                  kind: "text" },
  { value: "price",         label: "Price (IQD)",          kind: "number" },
  { value: "compare_price", label: "Compare-at price (IQD)", kind: "number" },
];

const TEXT_OPS = [
  { value: "is_equal_to",     label: "is equal to" },
  { value: "is_not_equal_to", label: "is not equal to" },
  { value: "contains",        label: "contains" },
  { value: "not_contains",    label: "does not contain" },
  { value: "starts_with",     label: "starts with" },
];

const NUM_OPS = [
  { value: "is_equal_to",     label: "is equal to" },
  { value: "is_not_equal_to", label: "is not equal to" },
  { value: "greater_than",    label: "is greater than" },
  { value: "less_than",       label: "is less than" },
];

// ─── API Helper ────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json() as { data: T; error?: string };
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Error ${res.status}`);
  return json.data;
}

// ─── Condition Row ─────────────────────────────────────────────────────────────

function ConditionRow({
  cond, onChange, onDelete,
}: {
  cond: Condition;
  onChange: (updated: Condition) => void;
  onDelete: () => void;
}) {
  const fieldMeta = FIELDS.find((f) => f.value === cond.field) ?? FIELDS[0]!;
  const ops = fieldMeta.kind === "number" ? NUM_OPS : TEXT_OPS;

  const setField = (field: string) => {
    const meta = FIELDS.find((f) => f.value === field) ?? FIELDS[0]!;
    const defaultOp = meta.kind === "number" ? "greater_than" : "is_equal_to";
    onChange({ ...cond, field, operator: defaultOp, value: "" });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <select
          className="h-9 rounded-lg border bg-background text-sm px-3 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={cond.field}
          onChange={(e) => setField(e.target.value)}
        >
          {FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>

      <div className="relative">
        <select
          className="h-9 rounded-lg border bg-background text-sm px-3 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={cond.operator}
          onChange={(e) => onChange({ ...cond, operator: e.target.value })}
        >
          {ops.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>

      <Input
        className="h-9 text-sm w-36 flex-1"
        placeholder={fieldMeta.kind === "number" ? "0" : "Enter value..."}
        type={fieldMeta.kind === "number" ? "number" : "text"}
        value={cond.value}
        onChange={(e) => onChange({ ...cond, value: e.target.value })}
      />

      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={onDelete}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Image Field ───────────────────────────────────────────────────────────────

function ImageField({
  label, value, onChange, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-xl border-2 border-dashed bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1">
          <Input
            placeholder="https://example.com/image.jpg"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 text-sm"
          />
          {value && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-destructive mt-1"
              onClick={() => onChange("")}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Smart Preview ─────────────────────────────────────────────────────────────

function SmartPreview({
  conditions, match,
}: {
  conditions: Condition[]; match: string;
}) {
  const validConditions = conditions.filter((c) => c.value.trim() !== "");

  const { data, isLoading } = useQuery<Product[]>({
    queryKey: ["smart-preview", JSON.stringify(validConditions), match],
    queryFn: () => apiFetch<Product[]>("/admin/collections/smart-preview", {
      method: "POST",
      body: JSON.stringify({ conditions: validConditions, match }),
    }),
    staleTime: 5_000,
    enabled: validConditions.length > 0,
  });

  if (validConditions.length === 0) {
    return (
      <div className="border rounded-xl p-4 text-center text-sm text-muted-foreground bg-muted/10">
        <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
        Add conditions to see matching products
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border rounded-xl p-4 text-center text-sm text-muted-foreground">
        Finding matching products...
      </div>
    );
  }

  const products = data ?? [];

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="bg-muted/30 px-4 py-2 flex items-center justify-between border-b">
        <span className="text-xs font-semibold text-muted-foreground">Matching Products</span>
        <Badge variant="secondary" className="text-xs">{products.length} products</Badge>
      </div>
      {products.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No products match these conditions
        </div>
      ) : (
        <div className="divide-y max-h-64 overflow-y-auto">
          {products.slice(0, 20).map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-8 h-8 rounded-md bg-muted overflow-hidden flex-shrink-0">
                {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.vendor}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {(p.price ?? 0).toLocaleString()} IQD
              </span>
            </div>
          ))}
          {products.length > 20 && (
            <div className="px-4 py-2 text-xs text-muted-foreground text-center">
              +{products.length - 20} more products
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Form ─────────────────────────────────────────────────────────────────

export default function CollectionForm() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = Boolean(params.id);

  const [form, setForm] = useState<CollectionData>({
    title: "",
    description: "",
    image: "",
    backgroundImage: "",
    collectionType: "manual",
    conditionsMatch: "all",
    conditions: [],
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["admin-collection-detail", params.id],
    queryFn: () => apiFetch<Record<string, unknown>>(`/admin/collections/${params.id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      title: (existing["title"] as string) || "",
      description: (existing["description"] as string) || "",
      image: (existing["image"] as string) || "",
      backgroundImage: (existing["backgroundImage"] as string) || "",
      collectionType: ((existing["collectionType"] as string) || "manual") as "manual" | "smart",
      conditionsMatch: ((existing["conditionsMatch"] as string) || "all") as "all" | "any",
      conditions: ((existing["conditions"] as Condition[]) || []).map((c, i) => ({ ...c, id: String(i) })),
    });
  }, [existing]);

  const save = useMutation({
    mutationFn: (data: CollectionData) => {
      const payload = {
        ...data,
        conditions: data.conditions.map(({ id: _, ...c }) => c),
      };
      if (isEdit) {
        return apiFetch(`/admin/collections/${params.id}`, { method: "PUT", body: JSON.stringify(payload) });
      }
      return apiFetch("/admin/collections", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections-hub"] });
      qc.invalidateQueries({ queryKey: ["admin-collection-detail", params.id] });
      toast({ title: isEdit ? "Collection updated" : "Collection created" });
      navigate("/collections");
    },
    onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
  });

  const addCondition = () => {
    setForm((f) => ({
      ...f,
      conditions: [
        ...f.conditions,
        { id: `c_${Date.now()}`, field: "title", operator: "is_equal_to", value: "" },
      ],
    }));
  };

  const updateCondition = (id: string, updated: Condition) => {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.map((c) => (c.id === id ? updated : c)),
    }));
  };

  const removeCondition = (id: string) => {
    setForm((f) => ({ ...f, conditions: f.conditions.filter((c) => c.id !== id) }));
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading collection...</div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/collections")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">{isEdit ? "Edit Collection" : "New Collection"}</h1>
        </div>
        <Button
          onClick={() => save.mutate(form)}
          disabled={!form.title.trim() || save.isPending}
          className="min-w-[80px]"
        >
          {save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Basic Info */}
      <div className="border rounded-2xl p-5 space-y-4 bg-card">
        <h2 className="font-semibold">Basic Info</h2>
        <div className="space-y-1">
          <Label className="text-xs">Title *</Label>
          <Input
            placeholder="e.g. Summer Collection, Under 25,000 IQD"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <textarea
            rows={3}
            placeholder="Optional description..."
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
      </div>

      {/* Images */}
      <div className="border rounded-2xl p-5 space-y-5 bg-card">
        <h2 className="font-semibold">Images</h2>
        <ImageField
          label="Collection Image (صورة القسم)"
          hint="Main image shown as the collection thumbnail or icon."
          value={form.image}
          onChange={(v) => setForm((f) => ({ ...f, image: v }))}
        />
        <div className="border-t" />
        <ImageField
          label="Background Image (صورة خلفية القسم)"
          hint="Full-width background shown behind the collection header."
          value={form.backgroundImage}
          onChange={(v) => setForm((f) => ({ ...f, backgroundImage: v }))}
        />
      </div>

      {/* Collection Type */}
      <div className="border rounded-2xl p-5 space-y-4 bg-card">
        <h2 className="font-semibold">Collection Type</h2>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, collectionType: "manual" }))}
            className={cn(
              "border-2 rounded-xl p-4 text-left transition-all",
              form.collectionType === "manual"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            )}
          >
            <Users className={cn("w-5 h-5 mb-2", form.collectionType === "manual" ? "text-primary" : "text-muted-foreground")} />
            <p className="font-semibold text-sm">Manual</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add products one by one</p>
          </button>

          <button
            type="button"
            onClick={() => setForm((f) => ({
              ...f,
              collectionType: "smart",
              conditions: f.conditions.length === 0
                ? [{ id: `c_${Date.now()}`, field: "tag", operator: "is_equal_to", value: "" }]
                : f.conditions,
            }))}
            className={cn(
              "border-2 rounded-xl p-4 text-left transition-all",
              form.collectionType === "smart"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            )}
          >
            <Wand2 className={cn("w-5 h-5 mb-2", form.collectionType === "smart" ? "text-primary" : "text-muted-foreground")} />
            <p className="font-semibold text-sm">Smart</p>
            <p className="text-xs text-muted-foreground mt-0.5">Auto-fill using conditions</p>
          </button>
        </div>

        {form.collectionType === "manual" && (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            Products are added manually from the Collections page using the product picker.
          </p>
        )}
      </div>

      {/* Conditions (Smart only) */}
      {form.collectionType === "smart" && (
        <div className="border rounded-2xl p-5 space-y-4 bg-card">
          <div>
            <h2 className="font-semibold">Conditions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Products matching these conditions will be automatically included.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Products must match:</p>
            <div className="flex gap-4">
              {(["all", "any"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    form.conditionsMatch === m ? "border-primary" : "border-border"
                  )}>
                    {form.conditionsMatch === m && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <input
                    type="radio"
                    className="sr-only"
                    value={m}
                    checked={form.conditionsMatch === m}
                    onChange={() => setForm((f) => ({ ...f, conditionsMatch: m }))}
                  />
                  <span className="text-sm">{m === "all" ? "all conditions" : "any condition"}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {form.conditions.map((cond) => (
              <ConditionRow
                key={cond.id}
                cond={cond}
                onChange={(updated) => updateCondition(cond.id, updated)}
                onDelete={() => removeCondition(cond.id)}
              />
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addCondition}>
              <Plus className="w-3.5 h-3.5" />
              Add another condition
            </Button>
          </div>

          <div className="border-t pt-4">
            <SmartPreview conditions={form.conditions} match={form.conditionsMatch} />
          </div>
        </div>
      )}

      {/* Bottom Save */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t px-4 py-3 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => navigate("/collections")}>
          Cancel
        </Button>
        <Button
          onClick={() => save.mutate(form)}
          disabled={!form.title.trim() || save.isPending}
        >
          {save.isPending ? "Saving..." : isEdit ? "Update Collection" : "Create Collection"}
        </Button>
      </div>
    </div>
  );
}
