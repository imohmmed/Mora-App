import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api";
import { useT } from "@/i18n/LanguageContext";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquareText, Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";

type CannedResponse = {
  id: number;
  short_code: string;
  content: string;
};

export default function CannedResponsesPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<CannedResponse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["canned_responses"],
    queryFn: async () => {
      const res = await adminFetch<CannedResponse[]>("/admin/chat/canned_responses");
      if (res.error) throw new Error(res.error);
      return res.data ?? [];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminFetch(`/admin/chat/canned_responses/${id}`, { method: "DELETE" });
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["canned_responses"] });
      toast({ title: t("canned.toast.deleted") });
      setToDelete(null);
    },
    onError: (e) => toast({ title: e instanceof Error ? e.message : t("chat.error.generic"), variant: "destructive" }),
  });

  const all = data ?? [];
  const items = search.trim()
    ? all.filter(
        (r) =>
          r.short_code.toLowerCase().includes(search.toLowerCase()) ||
          r.content.toLowerCase().includes(search.toLowerCase())
      )
    : all;

  return (
    <PageContainer>
      <PageHeader
        title={t("canned.title")}
        subtitle={t("canned.subtitle")}
        actions={
          <Button onClick={() => setCreating(true)} data-testid="button-new-canned">
            <Plus className="h-4 w-4 me-1.5" />
            {t("canned.new")}
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("canned.search")}
          className="ps-9"
          data-testid="input-search-canned"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquareText}
            title={search ? t("canned.title") : t("canned.empty.title")}
            description={search ? undefined : t("canned.empty.desc")}
            action={
              !search && (
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("canned.empty.cta")}
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t("canned.count", { n: items.length })}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((r) => (
              <Card
                key={r.id}
                className="group p-4 flex flex-col gap-2 hover-elevate transition-shadow"
                data-testid={`card-canned-${r.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    /{r.short_code}
                  </Badge>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditing(r)}
                      data-testid={`button-edit-canned-${r.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setToDelete(r)}
                      data-testid={`button-delete-canned-${r.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-4">{r.content}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      <CannedForm
        open={creating || !!editing}
        initial={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("canned.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("canned.delete.desc", { code: toDelete?.short_code ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && deleteMut.mutate(toDelete.id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function CannedForm({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: CannedResponse | null;
  onClose: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [shortCode, setShortCode] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  // Sync form fields whenever the dialog opens for a different record.
  useEffect(() => {
    if (!open) return;
    setShortCode(initial?.short_code ?? "");
    setContent(initial?.content ?? "");
    setError("");
  }, [open, initial?.id]);

  const mut = useMutation({
    mutationFn: async () => {
      const body = JSON.stringify({ short_code: shortCode.trim(), content: content.trim() });
      const path = isEdit ? `/admin/chat/canned_responses/${initial!.id}` : "/admin/chat/canned_responses";
      const res = await adminFetch(path, { method: isEdit ? "PUT" : "POST", body });
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["canned_responses"] });
      toast({ title: isEdit ? t("canned.toast.updated") : t("canned.toast.created") });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("chat.error.generic")),
  });

  const submit = () => {
    if (!shortCode.trim()) return setError(t("canned.err.shortCodeRequired"));
    if (!content.trim()) return setError(t("canned.err.contentRequired"));
    setError("");
    mut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("canned.form.editTitle") : t("canned.form.newTitle")}</DialogTitle>
          <DialogDescription>{t("canned.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="canned-code">{t("canned.form.shortCode")}</Label>
            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">/</span>
              <Input
                id="canned-code"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                placeholder={t("canned.form.shortCodePlaceholder")}
                className="ps-7 font-mono"
                data-testid="input-canned-code"
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("canned.form.shortCodeHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="canned-content">{t("canned.form.content")}</Label>
            <Textarea
              id="canned-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("canned.form.contentPlaceholder")}
              rows={5}
              data-testid="input-canned-content"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("action.cancel")}
          </Button>
          <Button onClick={submit} disabled={mut.isPending} data-testid="button-save-canned">
            {mut.isPending && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
            {t("action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
