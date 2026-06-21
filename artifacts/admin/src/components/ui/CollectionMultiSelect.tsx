import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Search, ChevronDown, ChevronRight,
  BookImage, Layers, FolderOpen, ImageIcon,
} from "lucide-react";

interface Collection { id: string; title: string; }
interface StoryItem  { id: string; title: string; titleAr?: string; imageUrl?: string; collectionId?: string | null; }
interface StoryRow   { id: string; title: string; items: StoryItem[]; }

const QUICK_SLUGS = [
  { slug: "brand-deals",   label: "Brand Deals" },
  { slug: "hot-seller",    label: "Hot Seller" },
  { slug: "gift-wrapping", label: "Gift Wrapping" },
];

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
  productId: string;
}

export function CollectionMultiSelect({ selected, onChange, productId }: Props) {

  // ── Stories ──────────────────────────────────────────────────────────────
  const [storyRows, setStoryRows]     = useState<StoryRow[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [storiesOpen, setStoriesOpen] = useState(true);

  useEffect(() => {
    adminFetch<StoryRow[]>("/admin/story-rows")
      .then((r) => setStoryRows(r.data ?? []))
      .finally(() => setStoriesLoading(false));
  }, []);

  const toggleStory = (colId: string) => {
    if (selected.includes(colId)) onChange(selected.filter((s) => s !== colId));
    else onChange([...selected, colId]);
  };

  // IDs of all collections linked to story items (used to hide from Collections list)
  const storyColIds = new Set(
    storyRows.flatMap((r) => r.items.map((i) => i.collectionId).filter(Boolean) as string[])
  );

  // ── Quick Sections ────────────────────────────────────────────────────────
  const [quickStatus,  setQuickStatus]  = useState<Record<string, boolean>>({});
  const [quickLoading, setQuickLoading] = useState<Record<string, boolean>>({});
  const [quickOpen,    setQuickOpen]    = useState(true);

  useEffect(() => {
    if (!productId) return;
    Promise.all(
      QUICK_SLUGS.map(async ({ slug }) => {
        const r = await adminFetch<Array<{ id: string }>>(`/admin/special-collections/${slug}/items`);
        return { slug, has: (r.data ?? []).some((p) => p.id === productId) };
      })
    ).then((results) => {
      const s: Record<string, boolean> = {};
      results.forEach(({ slug, has }) => { s[slug] = has; });
      setQuickStatus(s);
    });
  }, [productId]);

  const toggleQuick = async (slug: string) => {
    if (quickLoading[slug]) return;
    const isIn = quickStatus[slug];
    setQuickLoading((l) => ({ ...l, [slug]: true }));
    try {
      if (isIn) {
        await adminFetch(`/admin/special-collections/${slug}/items/${productId}`, { method: "DELETE" });
      } else {
        await adminFetch(`/admin/special-collections/${slug}/items`, {
          method: "POST",
          body: JSON.stringify({ productId }),
        });
      }
      setQuickStatus((s) => ({ ...s, [slug]: !isIn }));
    } catch {
      // ignore
    } finally {
      setQuickLoading((l) => ({ ...l, [slug]: false }));
    }
  };

  // ── Regular Collections ───────────────────────────────────────────────────
  const [collections, setCollections] = useState<Collection[]>([]);
  const [colLoading,  setColLoading]  = useState(true);
  const [search,      setSearch]      = useState("");
  const [colsOpen,    setColsOpen]    = useState(true);

  useEffect(() => {
    adminFetch<Collection[]>("/admin/collections")
      .then((r) => setCollections(r.data ?? []))
      .finally(() => setColLoading(false));
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };

  const filtered = collections
    .filter((c) => !storyColIds.has(c.id))                                // hide story-linked collections
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase())); // search

  // ── Selected summary badges ───────────────────────────────────────────────
  const badgeNames: string[] = [
    ...storyRows.flatMap((r) =>
      r.items
        .filter((i) => i.collectionId && selected.includes(i.collectionId))
        .map((i) => i.titleAr || i.title)
    ),
    ...QUICK_SLUGS.filter(({ slug }) => quickStatus[slug]).map(({ label }) => label),
    ...collections.filter((c) => selected.includes(c.id) && !storyColIds.has(c.id)).map((c) => c.title),
  ];

  return (
    <div className="space-y-3">
      {badgeNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badgeNames.map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
          ))}
        </div>
      )}

      {/* ── STORIES ────────────────────────────────────────────────────── */}
      <SectionShell
        icon={<BookImage className="w-3.5 h-3.5 text-blue-500" />}
        label="Stories"
        open={storiesOpen}
        onToggle={() => setStoriesOpen((o) => !o)}
        badge="saved with product"
      >
        {storiesLoading ? (
          <Spinner />
        ) : storyRows.filter((r) => r.items.length > 0).length === 0 ? (
          <Empty text="No story rows yet" />
        ) : (
          storyRows.filter((r) => r.items.length > 0).map((row) => (
            <div key={row.id}>
              {row.title && (
                <div className="px-3 py-1.5 bg-muted/30 border-b">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    {row.title}
                  </span>
                </div>
              )}
              {row.items.map((item) => {
                const enabled = !!item.collectionId;
                const checked = enabled && selected.includes(item.collectionId!);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2.5 px-3 py-2 border-b last:border-0 transition-colors
                      ${enabled ? "cursor-pointer hover:bg-muted" : "opacity-40 cursor-not-allowed"}`}
                    onClick={() => enabled && toggleStory(item.collectionId!)}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <ImageIcon className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <Checkbox
                      checked={checked}
                      disabled={!enabled}
                      onCheckedChange={() => enabled && toggleStory(item.collectionId!)}
                    />
                    <span className="text-sm flex-1">{item.titleAr || item.title}</span>
                    {!enabled && (
                      <span className="text-[10px] text-muted-foreground">no collection set</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </SectionShell>

      {/* ── QUICK SECTIONS ─────────────────────────────────────────────── */}
      <SectionShell
        icon={<Layers className="w-3.5 h-3.5 text-orange-500" />}
        label="Quick Sections"
        open={quickOpen}
        onToggle={() => setQuickOpen((o) => !o)}
        badge="saves instantly"
      >
        {QUICK_SLUGS.map(({ slug, label }) => (
          <div
            key={slug}
            className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-muted border-b last:border-0 transition-colors"
            onClick={() => toggleQuick(slug)}
          >
            {quickLoading[slug]
              ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
              : <Checkbox checked={!!quickStatus[slug]} onCheckedChange={() => toggleQuick(slug)} />
            }
            <span className="text-sm flex-1">{label}</span>
          </div>
        ))}
      </SectionShell>

      {/* ── REGULAR COLLECTIONS ────────────────────────────────────────── */}
      <SectionShell
        icon={<FolderOpen className="w-3.5 h-3.5 text-emerald-500" />}
        label="Collections"
        open={colsOpen}
        onToggle={() => setColsOpen((o) => !o)}
        badge="saved with product"
      >
        <div className="flex items-center px-3 border-b">
          <Search className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
          <Input
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 h-9 px-0 text-sm focus-visible:ring-0 bg-transparent"
          />
        </div>
        <div className="max-h-44 overflow-y-auto p-1">
          {colLoading ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <Empty text={collections.length === 0 ? "No collections yet" : "No results"} />
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-muted cursor-pointer"
                onClick={() => toggle(c.id)}
              >
                <Checkbox
                  checked={selected.includes(c.id)}
                  onCheckedChange={() => toggle(c.id)}
                  id={`col-${c.id}`}
                />
                <Label htmlFor={`col-${c.id}`} className="text-sm cursor-pointer flex-1">
                  {c.title}
                </Label>
              </div>
            ))
          )}
        </div>
      </SectionShell>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionShell({
  icon, label, badge, open, onToggle, children,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left bg-muted/30 hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        {icon}
        <span className="text-xs font-bold flex-1">{label}</span>
        {badge && <span className="text-[10px] text-muted-foreground mr-1">{badge}</span>}
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        }
      </button>
      {open && <div className="border-t">{children}</div>}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{text}</p>;
}
