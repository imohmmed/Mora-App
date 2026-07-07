import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Pencil, Trash2, Search, Loader2, Image as ImageIcon,
  FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

type Collection = {
  id: string; title: string; titleAr?: string;
  description?: string; image?: string;
  productsCount?: number; collectionType?: string; createdAt?: string;
};

export default function BrowsePage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "manual" | "smart">("all");

  const { data: cols = [], isLoading } = useQuery<Collection[]>({
    queryKey: ["admin-collections-hub"],
    queryFn: () => apiFetch<Collection[]>("/admin/collections"),
    staleTime: 30_000,
  });

  const deleteCol = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/collections/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-collections-hub"] }),
    onError: (e) => toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" }),
  });

  const filtered = cols.filter((c) => {
    const matchType = typeFilter === "all" || (c.collectionType ?? "manual") === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = q === "" || c.title.toLowerCase().includes(q) || (c.titleAr ?? "").includes(q);
    return matchType && matchSearch;
  });

  const smartCols  = filtered.filter((c) => c.collectionType === "smart");
  const manualCols = filtered.filter((c) => c.collectionType !== "smart");

  return (
    <PageContainer className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/collections">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t("action.back")}
          </button>
        </Link>
      </div>

      <PageHeader title={t("collections.title")} subtitle={t("collections.section.hint")} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-[160px] border rounded-lg px-3 h-9 bg-background">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("products.searchPlaceholder")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
          {(["all", "manual", "smart"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize",
                typeFilter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? t("common.all") : f === "manual" ? t("collections.badge.manual") : t("collections.badge.smart")}
            </button>
          ))}
        </div>
        <Link href="/collections/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> {t("collections.new")}
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? t("collections.noResults") : t("collections.empty")}
          </p>
          {!search && (
            <Link href="/collections/new">
              <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                <Plus className="w-4 h-4" /> {t("collections.new")}
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Smart collections */}
          {smartCols.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                {t("collections.badge.smart")}
              </p>
              <div className="divide-y border rounded-2xl overflow-hidden bg-card">
                {smartCols.map((col) => (
                  <CollectionRow key={col.id} col={col} onDelete={() => deleteCol.mutate(col.id)} t={t} />
                ))}
              </div>
            </div>
          )}
          {/* Manual collections */}
          {manualCols.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                {t("collections.badge.manual")}
              </p>
              <div className="divide-y border rounded-2xl overflow-hidden bg-card">
                {manualCols.map((col) => (
                  <CollectionRow key={col.id} col={col} onDelete={() => deleteCol.mutate(col.id)} t={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}

function CollectionRow({ col, onDelete, t }: { col: Collection; onDelete: () => void; t: (k: string, o?: any) => string }) {
  const isSmart = col.collectionType === "smart";
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
      {/* Image */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 border">
        {col.image
          ? <img src={col.image} alt={col.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/30" /></div>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-semibold text-sm leading-tight truncate max-w-[200px]">{col.title}</p>
          {col.titleAr && <span className="text-xs text-muted-foreground">{col.titleAr}</span>}
          {isSmart
            ? <Badge variant="secondary" className="text-[10px] py-0 bg-violet-50 text-violet-700 border-violet-200">{t("collections.badge.smart")}</Badge>
            : <Badge variant="outline" className="text-[10px] py-0">{t("collections.badge.manual")}</Badge>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {col.productsCount != null && (
            <span className="text-xs text-muted-foreground">{t("collections.productsCount", { n: col.productsCount })}</span>
          )}
          {col.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[220px]">{col.description}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Link href={`/collections/${col.id}/edit`}>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Pencil className="w-3 h-3" /> {t("action.edit")}
          </Button>
        </Link>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
