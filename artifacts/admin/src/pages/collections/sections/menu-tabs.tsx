import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Eye, Loader2, CheckCircle2,
  GripVertical,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LanguageContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const adminToken = () => { try { return localStorage.getItem("mora_admin_token") || ""; } catch { return ""; } };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json", Accept: "application/json",
      Authorization: `Bearer ${adminToken()}`, ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as { data: T; error?: string };
  if (!res.ok) throw new Error((json as any).error ?? `Error ${res.status}`);
  return json.data;
}

type TabConfig = {
  id: string; label: string; arabicLabel?: string;
  filterType: "all" | "gender" | "category" | "sale" | "foryou" | string;
  filterValue?: string;
};

const DEFAULT_TABS: TabConfig[] = [
  { id: "tab_all",    label: "ALL",     arabicLabel: "الكل",     filterType: "all" },
  { id: "tab_women",  label: "WOMEN",   arabicLabel: "نساء",     filterType: "gender", filterValue: "women" },
  { id: "tab_men",    label: "MEN",     arabicLabel: "رجال",     filterType: "gender", filterValue: "men" },
  { id: "tab_beauty", label: "BEAUTY",  arabicLabel: "جمال",     filterType: "category", filterValue: "beauty" },
  { id: "tab_sale",   label: "SALE",    arabicLabel: "تخفيضات",  filterType: "sale" },
  { id: "tab_foryou", label: "FOR YOU", arabicLabel: "لك ✦",     filterType: "foryou" },
];

export default function MenuTabsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const [tabs, setTabs] = useState<TabConfig[]>(DEFAULT_TABS);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: sections, isLoading } = useQuery<{ id: string; key: string; items: TabConfig[] }[]>({
    queryKey: ["admin-content-sections"],
    queryFn: () => apiFetch<{ id: string; key: string; items: TabConfig[] }[]>("/admin/content-sections"),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!sections) return;
    const section = sections.find((s) => s.key === "menu_tabs");
    if (section) {
      setSectionId(section.id);
      if (section.items?.length) setTabs(section.items as TabConfig[]);
    }
  }, [sections]);

  const update = (i: number, field: keyof TabConfig, value: string) => {
    setTabs((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
    setSaved(false);
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    setTabs((prev) => { const n = [...prev]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; });
    setSaved(false);
  };

  const moveDown = (i: number) => {
    if (i === tabs.length - 1) return;
    setTabs((prev) => { const n = [...prev]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n; });
    setSaved(false);
  };

  const removeTab = (i: number) => {
    setTabs((prev) => prev.filter((_, idx) => idx !== i));
    setSaved(false);
  };

  const addTab = () => {
    setTabs((prev) => [
      ...prev,
      { id: `tab_${Date.now()}`, label: "NEW", arabicLabel: "جديد", filterType: "all" },
    ]);
    setSaved(false);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      if (sectionId) {
        await apiFetch(`/admin/content-sections/${sectionId}`, {
          method: "PUT", body: JSON.stringify({ items: tabs }),
        });
      } else {
        const result = await apiFetch<{ id: string }>("/admin/content-sections", {
          method: "POST",
          body: JSON.stringify({ key: "menu_tabs", title: "Menu Tab Bar", items: tabs, status: "active" }),
        });
        if ((result as any)?.id) setSectionId((result as any).id);
      }
      setSaved(true);
      toast({ title: t("toast.saved") });
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const FILTER_OPTIONS = [
    { value: "all",      label: t("collections.filter.allProducts") },
    { value: "gender",   label: t("collections.filter.gender") },
    { value: "category", label: t("collections.filter.category") },
    { value: "sale",     label: t("collections.filter.saleDeals") },
    { value: "foryou",   label: t("collections.filter.forYou") },
  ];

  return (
    <PageContainer className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/collections">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t("action.back")}
          </button>
        </Link>
      </div>

      <PageHeader
        title={t("collections.menuTabBar.title")}
        subtitle={t("collections.menuTabBar.hint")}
      />

      {/* Live preview strip */}
      <div className="bg-card rounded-2xl border overflow-hidden shadow-sm mb-6">
        <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{t("collections.preview.homeTabBar")}</span>
        </div>
        <div className="px-4 py-3 overflow-x-auto">
          <div className="flex gap-5 w-max">
            {tabs.map((tab, i) => (
              <div
                key={tab.id}
                className={cn(
                  "flex flex-col items-center gap-0.5 pb-1.5 relative",
                  i === 0 && "after:absolute after:bottom-0 after:start-0 after:end-0 after:h-0.5 after:bg-foreground after:rounded-full"
                )}
              >
                {tab.arabicLabel && (
                  <span className="text-[11px] font-bold leading-tight whitespace-nowrap">{tab.arabicLabel}</span>
                )}
                <span className={cn(
                  "leading-tight whitespace-nowrap",
                  tab.arabicLabel ? "text-[9px] text-muted-foreground" : "text-[11px] font-bold text-foreground"
                )}>{tab.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab cards */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : (
        <div className="space-y-3">
          {tabs.map((tab, i) => (
            <div key={tab.id} className="border rounded-2xl bg-card overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20 border-b">
                <span className="w-5 text-center text-xs text-muted-foreground font-mono font-semibold">{i + 1}</span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {tab.arabicLabel && (
                    <span className="text-sm font-bold truncate" dir="rtl">{tab.arabicLabel}</span>
                  )}
                  <span className="text-xs text-muted-foreground font-mono truncate">{tab.label}</span>
                </div>
                {/* Up / Down / Delete */}
                <div className="flex items-center gap-1">
                  <button
                    type="button" disabled={i === 0} onClick={() => moveUp(i)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-25 transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button" disabled={i === tabs.length - 1} onClick={() => moveDown(i)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-25 transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button" onClick={() => removeTab(i)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card body — fields */}
              <div className="p-3 space-y-2.5">
                {/* Arabic + English name on same row */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">الاسم عربي</Label>
                    <Input
                      value={tab.arabicLabel ?? ""}
                      onChange={(e) => update(i, "arabicLabel", e.target.value)}
                      className="h-9 text-sm text-right"
                      dir="rtl"
                      placeholder="نساء"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">English</Label>
                    <Input
                      value={tab.label}
                      onChange={(e) => update(i, "label", e.target.value.toUpperCase())}
                      className="h-9 text-sm font-mono font-semibold tracking-wide"
                      placeholder="WOMEN"
                    />
                  </div>
                </div>

                {/* Filter type */}
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Filter</Label>
                  <div className="flex gap-2 flex-wrap">
                    {FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          update(i, "filterType", opt.value);
                          if (opt.value === "gender" && !tab.filterValue) update(i, "filterValue", "women");
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
                          tab.filterType === opt.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter value (gender or category) */}
                {tab.filterType === "gender" && (
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">Gender</Label>
                    <div className="flex gap-2">
                      {["women", "men"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => update(i, "filterValue", g)}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize",
                            tab.filterValue === g
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {t(`collections.gender.${g}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {tab.filterType === "category" && (
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">Category slug</Label>
                    <Input
                      value={tab.filterValue ?? ""}
                      onChange={(e) => update(i, "filterValue", e.target.value)}
                      className="h-9 text-sm"
                      placeholder="beauty, accessories…"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-4 gap-3">
        <button
          type="button" onClick={addTab}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border rounded-xl px-4 py-2 hover:bg-muted/50 transition-colors"
        >
          <Plus className="w-4 h-4" /> {t("collections.addTab")}
        </button>
        <button
          type="button" onClick={saveAll} disabled={saving}
          className={cn(
            "flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-xl transition-colors",
            saving ? "bg-primary/70 text-primary-foreground cursor-wait" :
            saved  ? "bg-green-500/10 text-green-700 border border-green-200" :
                     "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("action.saving")}</> :
           saved  ? <><CheckCircle2 className="w-4 h-4" /> {t("toast.saved")}</> :
                    t("action.saveChanges")}
        </button>
      </div>
    </PageContainer>
  );
}
