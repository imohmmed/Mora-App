import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Eye, Loader2, Upload, Image as ImageIcon,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

type BrowseSection = {
  slug: string; titleEn: string; titleAr: string;
  image: string; productCount: number;
};

export default function SearchCollectionsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const [sections, setSections] = useState<BrowseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<BrowseSection[]>("/admin/browse-collections");
      setSections(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    try {
      const data = await apiFetch<BrowseSection>("/admin/browse-collections", {
        method: "POST",
        body: JSON.stringify({ titleEn: "New Section", titleAr: "قسم جديد" }),
      });
      setSections((prev) => [...prev, { ...data, productCount: 0 }]);
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Delete this browse section?")) return;
    try {
      await apiFetch(`/admin/browse-collections/${slug}`, { method: "DELETE" });
      setSections((prev) => prev.filter((s) => s.slug !== slug));
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleFieldChange = (slug: string, field: "titleEn" | "titleAr", value: string) => {
    setSections((prev) => prev.map((s) => s.slug === slug ? { ...s, [field]: value } : s));
  };

  const handleSave = async (slug: string) => {
    const sec = sections.find((s) => s.slug === slug);
    if (!sec) return;
    setSavingSlug(slug);
    try {
      await apiFetch(`/admin/browse-collections/${slug}/meta`, {
        method: "PUT",
        body: JSON.stringify({ titleEn: sec.titleEn, titleAr: sec.titleAr, image: sec.image }),
      });
      toast({ title: t("toast.saved") });
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setSavingSlug(null); }
  };

  const handleImageUpload = async (slug: string, file: File) => {
    setUploadingSlug(slug);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`${API}/admin/uploads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken()}` },
        body: form,
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!json.data?.url) throw new Error(json.error ?? "Upload failed");
      const url = json.data.url;
      setSections((prev) => prev.map((s) => s.slug === slug ? { ...s, image: url } : s));
      const sec = sections.find((s) => s.slug === slug);
      await apiFetch(`/admin/browse-collections/${slug}/meta`, {
        method: "PUT",
        body: JSON.stringify({ titleEn: sec?.titleEn, titleAr: sec?.titleAr, image: url }),
      });
      toast({ title: t("toast.saved") });
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setUploadingSlug(null); }
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

      <PageHeader title={t("searchCol.title")} subtitle={t("searchCol.hint")} />

      {/* Image preview grid */}
      {sections.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm mb-6">
          <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{t("searchCol.preview")}</span>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-3">
            {sections.map((s) => (
              <div key={s.slug} className="rounded-xl overflow-hidden aspect-[4/3] bg-muted relative">
                {s.image ? (
                  <img src={s.image} alt={s.titleEn} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute bottom-0 start-0 end-0 bg-gradient-to-t from-black/60 px-2 py-1.5">
                  <p className="text-[10px] text-white font-semibold truncate">{s.titleAr || s.titleEn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          لا يوجد أقسام بعد. أضف قسم بالزر أدناه.
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((s) => (
            <div key={s.slug} className="border rounded-xl bg-background overflow-hidden">
              {/* Image + fields */}
              <div className="p-4 space-y-3">
                <div className="flex gap-3 items-start">
                  {/* Image upload */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div
                      className="w-20 h-16 rounded-xl border-2 border-dashed overflow-hidden relative cursor-pointer group bg-muted"
                      style={{ aspectRatio: "4/3" }}
                      onClick={() => document.getElementById(`search-img-${s.slug}`)?.click()}
                    >
                      {s.image ? (
                        <img src={s.image} alt="" className="w-full h-full object-cover" />
                      ) : uploadingSlug === s.slug ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground/50">
                          <Upload className="w-4 h-4" />
                          <span className="text-[9px]">4:3</span>
                        </div>
                      )}
                    </div>
                    <input
                      id={`search-img-${s.slug}`}
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(s.slug, f); e.target.value = ""; }}
                    />
                    {s.image && (
                      <button
                        className="text-[10px] text-destructive hover:underline"
                        onClick={() => setSections((prev) => prev.map((sec) => sec.slug === s.slug ? { ...sec, image: "" } : sec))}
                      >
                        {t("action.remove")}
                      </button>
                    )}
                  </div>

                  {/* Text fields */}
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label className="text-xs mb-1 block">الاسم (AR)</Label>
                      <Input
                        value={s.titleAr}
                        onChange={(e) => handleFieldChange(s.slug, "titleAr", e.target.value)}
                        className="h-8 text-sm" dir="rtl"
                        placeholder="اسم عربي"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Name (EN)</Label>
                      <Input
                        value={s.titleEn}
                        onChange={(e) => handleFieldChange(s.slug, "titleEn", e.target.value)}
                        className="h-8 text-sm"
                        placeholder="English name"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Slug: <code>{s.slug}</code> · {s.productCount} products</p>
                  </div>

                  {/* Delete */}
                  <button
                    className="text-muted-foreground hover:text-destructive mt-1 flex-shrink-0"
                    onClick={() => handleDelete(s.slug)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Save row */}
              <div className="border-t px-4 py-2.5 flex justify-end bg-muted/20">
                <Button
                  size="sm" className="h-7 text-xs"
                  onClick={() => handleSave(s.slug)}
                  disabled={savingSlug === s.slug || uploadingSlug === s.slug}
                >
                  {savingSlug === s.slug ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  {t("action.save")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4">
        <Button variant="outline" onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Add Section
        </Button>
      </div>
    </PageContainer>
  );
}
