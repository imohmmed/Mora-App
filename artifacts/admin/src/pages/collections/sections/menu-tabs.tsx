import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Eye, Loader2, CheckCircle2,
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
    setTabs((prev) => [...prev, { id: `tab_${Date.now()}`, label: "NEW", arabicLabel: "جديد", filterType: "all" }]);
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer className="max-w-2xl">
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

      {/* Live preview */}
      <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm mb-6">
        <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{t("collections.preview.homeTabBar")}</span>
        </div>
        <div className="px-4 py-3 flex gap-4 overflow-x-auto">
          {tabs.map((tab, i) => (
            <div
              key={tab.id}
              className={cn(
                "flex flex-col items-center gap-0.5 pb-1.5 flex-shrink-0 relative",
                i === 0 && "after:absolute after:bottom-0 after:start-0 after:end-0 after:h-0.5 after:bg-foreground after:rounded-full"
              )}
            >
              {tab.arabicLabel && (
                <span className="text-[11px] font-bold leading-tight">{tab.arabicLabel}</span>
              )}
              <span className={cn(
                "text-[9px] leading-tight",
                tab.arabicLabel ? "text-muted-foreground" : "text-[11px] font-bold text-foreground"
              )}>{tab.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs editor */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_1fr_10rem_auto] gap-2 px-2 pb-1">
            <div />
            <span className="text-xs font-medium text-muted-foreground">{t("collections.field.arabicName")}</span>
            <span className="text-xs font-medium text-muted-foreground">{t("collections.field.english")}</span>
            <span className="text-xs font-medium text-muted-foreground">{t("collections.field.filter")}</span>
            <div />
          </div>

          {tabs.map((tab, i) => (
            <div
              key={tab.id}
              className="grid grid-cols-[auto_1fr_1fr_10rem_auto] items-center gap-2 p-3 border rounded-xl bg-background"
            >
              <div className="w-5 text-muted-foreground/30 text-xs text-center">{i + 1}</div>

              <Input
                value={tab.arabicLabel ?? ""}
                onChange={(e) => update(i, "arabicLabel", e.target.value)}
                className="h-8 text-sm"
                placeholder={t("collections.placeholder.womenExample")}
                dir="rtl"
              />

              <Input
                value={tab.label}
                onChange={(e) => update(i, "label", e.target.value.toUpperCase())}
                className="h-8 text-sm font-mono font-semibold"
                placeholder={t("collections.placeholder.womenEnExample")}
              />

              <Select value={tab.filterType} onValueChange={(v) => {
                update(i, "filterType", v);
                if (v === "gender" && !tab.filterValue) update(i, "filterValue", "women");
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("collections.filter.allProducts")}</SelectItem>
                  <SelectItem value="gender">{t("collections.filter.gender")}</SelectItem>
                  <SelectItem value="category">{t("collections.filter.category")}</SelectItem>
                  <SelectItem value="sale">{t("collections.filter.saleDeals")}</SelectItem>
                  <SelectItem value="foryou">{t("collections.filter.forYou")}</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                {(tab.filterType === "gender" || tab.filterType === "category") && (
                  tab.filterType === "gender" ? (
                    <Select value={tab.filterValue ?? "women"} onValueChange={(v) => update(i, "filterValue", v)}>
                      <SelectTrigger className="h-8 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="women">{t("collections.gender.women")}</SelectItem>
                        <SelectItem value="men">{t("collections.gender.men")}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={tab.filterValue ?? ""}
                      onChange={(e) => update(i, "filterValue", e.target.value)}
                      className="h-8 w-20 text-xs"
                      placeholder={t("collections.category.placeholder")}
                    />
                  )
                )}
                <button
                  type="button" disabled={i === 0} onClick={() => moveUp(i)}
                  className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button" disabled={i === tabs.length - 1} onClick={() => moveDown(i)}
                  className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button" onClick={() => removeTab(i)}
                  className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <button
          type="button" onClick={addTab}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors"
        >
          <Plus className="w-4 h-4" /> {t("collections.addTab")}
        </button>
        <button
          type="button" onClick={saveAll} disabled={saving}
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors",
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
