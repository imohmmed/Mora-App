import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  LayoutList, Grid3x3, Tag, BookImage, Layers, FolderOpen,
  ChevronRight, Loader2,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useT } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const adminToken = () => {
  try { return localStorage.getItem("mora_admin_token") || ""; } catch { return ""; }
};

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${adminToken()}`, Accept: "application/json" },
  });
  const json = (await res.json()) as { data: T };
  return json.data;
}

type Counts = {
  menuTabs: number; searchCols: number; saleCols: number;
  stories: number; collections: number;
};

function useCounts() {
  return useQuery<Counts>({
    queryKey: ["hub-counts"],
    queryFn: async () => {
      const [cs, sc, sale, sr, cols] = await Promise.allSettled([
        apiFetch<{ key: string; items: unknown[] }[]>("/admin/content-sections"),
        apiFetch<unknown[]>("/admin/browse-collections"),
        apiFetch<unknown[]>("/admin/sale-collections"),
        apiFetch<unknown[]>("/admin/story-rows"),
        apiFetch<unknown[]>("/admin/collections"),
      ]);
      const contentSections = cs.status === "fulfilled" ? (cs.value as any[]) : [];
      const menuSection = contentSections.find((s: any) => s.key === "menu_tabs");
      return {
        menuTabs: menuSection?.items?.length ?? 0,
        searchCols: sc.status === "fulfilled" && Array.isArray(sc.value) ? sc.value.length : 0,
        saleCols: sale.status === "fulfilled" && Array.isArray(sale.value) ? sale.value.length : 0,
        stories: sr.status === "fulfilled" && Array.isArray(sr.value) ? sr.value.length : 0,
        collections: cols.status === "fulfilled" && Array.isArray(cols.value) ? cols.value.length : 0,
      };
    },
    staleTime: 30_000,
  });
}

type SectionDef = {
  path: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  getBadge: (c: Counts) => string;
};

export default function CollectionsHub() {
  const { t } = useT();
  const { data: counts, isLoading } = useCounts();

  const sections: SectionDef[] = [
    {
      path: "/collections/sections/menu-tabs",
      icon: LayoutList,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
      title: t("collections.menuTabBar.title"),
      desc: t("collections.menuTabBar.hint"),
      getBadge: (c) => `${c.menuTabs} tabs`,
    },
    {
      path: "/collections/sections/search",
      icon: Grid3x3,
      iconBg: "bg-sky-500/10",
      iconColor: "text-sky-600",
      title: t("searchCol.title"),
      desc: t("searchCol.hint"),
      getBadge: (c) => `${c.searchCols} items`,
    },
    {
      path: "/collections/sections/sale",
      icon: Tag,
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-600",
      title: "Home Sale Collections",
      desc: "بطاقات تخفيضات تظهر في الصفحة الرئيسية — صورة 9:16",
      getBadge: (c) => `${c.saleCols}`,
    },
    {
      path: "/collections/sections/stories",
      icon: BookImage,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      title: t("collections.stories.title"),
      desc: t("collections.stories.hint"),
      getBadge: (c) => `${c.stories} rows`,
    },
    {
      path: "/collections/sections/quick",
      icon: Layers,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
      title: t("collections.quick.title"),
      desc: t("collections.quick.hint"),
      getBadge: () => "4 slots",
    },
    {
      path: "/collections/sections/browse",
      icon: FolderOpen,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      title: t("collections.title"),
      desc: t("collections.section.hint"),
      getBadge: (c) => `${c.collections}`,
    },
  ];

  const empty: Counts = { menuTabs: 0, searchCols: 0, saleCols: 0, stories: 0, collections: 0 };

  return (
    <PageContainer className="max-w-2xl">
      <PageHeader title={t("collections.title")} subtitle={t("collections.hub.subtitle")} />

      <div className="space-y-2">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const badge = counts ? sec.getBadge(counts) : sec.getBadge(empty);
          return (
            <Link key={sec.path} href={sec.path}>
              <div className="flex items-center gap-4 p-4 rounded-2xl border bg-card hover:bg-accent/20 active:scale-[0.99] transition-all cursor-pointer">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", sec.iconBg, sec.iconColor)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">{sec.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{sec.desc}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground font-medium tabular-nums">
                    {isLoading
                      ? <Loader2 className="w-3 h-3 animate-spin inline" />
                      : badge}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
