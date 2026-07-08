import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Eye, Loader2, Upload, Image as ImageIcon, CheckCircle2,
} from "lucide-react";
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
  slug: string;
  titleEn: string; titleAr: string;
  descriptionEn: string; descriptionAr: string;
  image: string; backgroundImage: string;
  productCount: number;
};

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API}/admin/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken()}` },
    body: form,
  });
  const json = (await res.json()) as { data?: { url: string }; error?: string };
  if (!json.data?.url) throw new Error(json.error ?? "Upload failed");
  return json.data.url;
}

export default function SearchCollectionsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const [sections, setSections] = useState<BrowseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<BrowseSection[]>("/admin/browse-collections");
      setSections(data.map((s) => ({
        ...s,
        descriptionEn: (s as any).descriptionEn ?? "",
        descriptionAr: (s as any).descriptionAr ?? "",
        backgroundImage: (s as any).backgroundImage ?? "",
      })));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    try {
      const data = await apiFetch<BrowseSection>("/admin/browse-collections", {
        method: "POST",
        body: JSON.stringify({ titleEn: "New Section", titleAr: "قسم جديد" }),
      });
      setSections((prev) => [...prev, {
        ...data, productCount: 0,
        descriptionEn: "", descriptionAr: "", backgroundImage: "",
      }]);
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

  const setField = (slug: string, field: keyof BrowseSection, value: string) => {
    setSections((prev) => prev.map((s) => s.slug === slug ? { ...s, [field]: value } : s));
    setSavedSlug(null);
  };

  const handleSave = async (slug: string) => {
    const sec = sections.find((s) => s.slug === slug);
    if (!sec) return;
    setSavingSlug(slug);
    try {
      await apiFetch(`/admin/browse-collections/${slug}/meta`, {
        method: "PUT",
        body: JSON.stringify({
          titleEn: sec.titleEn, titleAr: sec.titleAr,
          descriptionEn: sec.descriptionEn, descriptionAr: sec.descriptionAr,
          image: sec.image, backgroundImage: sec.backgroundImage,
        }),
      });
      setSavedSlug(slug);
      toast({ title: t("toast.saved") });
      setTimeout(() => setSavedSlug((s) => s === slug ? null : s), 3000);
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setSavingSlug(null); }
  };

  const handleImageUpload = async (slug: string, file: File, field: "image" | "backgroundImage") => {
    setUploadingSlug(`${slug}_${field}`);
    try {
      const url = await uploadImage(file);
      setSections((prev) => prev.map((s) => s.slug === slug ? { ...s, [field]: url } : s));
      const sec = sections.find((s) => s.slug === slug);
      await apiFetch(`/admin/browse-collections/${slug}/meta`, {
        method: "PUT",
        body: JSON.stringify({
          titleEn: sec?.titleEn, titleAr: sec?.titleAr,
          descriptionEn: sec?.descriptionEn, descriptionAr: sec?.descriptionAr,
          image: field === "image" ? url : sec?.image,
          backgroundImage: field === "backgroundImage" ? url : sec?.backgroundImage,
        }),
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

      {/* Preview grid */}
      {sections.length > 0 && (
        <div className="bg-card rounded-2xl border overflow-hidden shadow-sm mb-6">
          <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{t("searchCol.preview")}</span>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-3">
            {sections.map((s) => (
              <div key={s.slug} className="rounded-xl overflow-hidden aspect-[4/3] bg-muted relative">
                {s.image
                  ? <img src={s.image} alt={s.titleEn} className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="w-6 h-6 text-muted-foreground/30" /></div>}
                <div className="absolute bottom-0 start-0 end-0 bg-gradient-to-t from-black/60 px-2 py-1.5">
                  <p className="text-[10px] text-white font-semibold truncate">{s.titleAr || s.titleEn}</p>
                  {(s.descriptionAr || s.descriptionEn) && (
                    <p className="text-[8px] text-white/70 truncate">{s.descriptionAr || s.descriptionEn}</p>
                  )}
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
        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s.slug} className="border rounded-2xl bg-card overflow-hidden">
              {/* Images row */}
              <div className="p-4 border-b bg-muted/10">
                <p className="text-xs font-semibold text-muted-foreground mb-3">الصور</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Section image (4:3) */}
                  <div>
                    <Label className="text-xs mb-1.5 block">صورة القسم (4:3)</Label>
                    <div
                      className="w-full rounded-xl border-2 border-dashed overflow-hidden cursor-pointer bg-muted hover:border-primary/50 transition-colors relative"
                      style={{ aspectRatio: "4/3" }}
                      onClick={() => document.getElementById(`img-${s.slug}`)?.click()}
                    >
                      {s.image
                        ? <img src={s.image} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50">
                            <Upload className="w-5 h-5" />
                            <span className="text-[10px]">4:3</span>
                          </div>}
                      {uploadingSlug === `${s.slug}_image` && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <input id={`img-${s.slug}`} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(s.slug, f, "image"); e.target.value = ""; }} />
                  </div>

                  {/* Background image (16:9) */}
                  <div>
                    <Label className="text-xs mb-1.5 block">صورة الخلفية (16:9)</Label>
                    <div
                      className="w-full rounded-xl border-2 border-dashed overflow-hidden cursor-pointer bg-muted hover:border-primary/50 transition-colors relative"
                      style={{ aspectRatio: "4/3" }}
                      onClick={() => document.getElementById(`bg-${s.slug}`)?.click()}
                    >
                      {s.backgroundImage
                        ? <img src={s.backgroundImage} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50">
                            <Upload className="w-5 h-5" />
                            <span className="text-[10px]">خلفية</span>
                          </div>}
                      {uploadingSlug === `${s.slug}_backgroundImage` && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <input id={`bg-${s.slug}`} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(s.slug, f, "backgroundImage"); e.target.value = ""; }} />
                  </div>
                </div>
              </div>

              {/* Text fields */}
              <div className="p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">الاسم والوصف</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">الاسم (AR)</Label>
                    <Input value={s.titleAr} onChange={(e) => setField(s.slug, "titleAr", e.target.value)}
                      className="h-9 text-sm" dir="rtl" placeholder="اسم القسم بالعربي" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Name (EN)</Label>
                    <Input value={s.titleEn} onChange={(e) => setField(s.slug, "titleEn", e.target.value)}
                      className="h-9 text-sm" placeholder="Section name" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">الوصف (AR)</Label>
                    <Input value={s.descriptionAr} onChange={(e) => setField(s.slug, "descriptionAr", e.target.value)}
                      className="h-9 text-sm" dir="rtl" placeholder="وصف يظهر تحت الاسم" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Description (EN)</Label>
                    <Input value={s.descriptionEn} onChange={(e) => setField(s.slug, "descriptionEn", e.target.value)}
                      className="h-9 text-sm" placeholder="Shown under section name" />
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">Slug: <code>{s.slug}</code> · {s.productCount} products</p>
              </div>

              {/* Footer */}
              <div className="border-t px-4 py-3 flex items-center justify-between bg-muted/10">
                <button
                  className="text-xs text-destructive hover:underline flex items-center gap-1"
                  onClick={() => handleDelete(s.slug)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> حذف القسم
                </button>
                <Button size="sm" className="h-8 gap-1.5"
                  onClick={() => handleSave(s.slug)}
                  disabled={savingSlug === s.slug || uploadingSlug !== null}
                >
                  {savingSlug === s.slug
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> {t("action.saving")}</>
                    : savedSlug === s.slug
                    ? <><CheckCircle2 className="w-3 h-3" /> {t("toast.saved")}</>
                    : t("action.save")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4">
        <Button variant="outline" onClick={handleAdd} className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" /> إضافة قسم
        </Button>
      </div>
    </PageContainer>
  );
}
