import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ShoppingCart, Package, Users, FolderTree, Tags, FileText,
  Settings, BarChart3, Warehouse, Bell, Truck, UserSearch, Gift, ChevronLeft,
  PanelLeftClose, PanelLeft, BellRing, MessageSquareText, Zap, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminAuth, type AdminPermissions } from "@/context/AdminAuthContext";
import { useT } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type NavLeaf = { href: string; labelKey: TranslationKey; icon: React.ElementType };
type NavSection = {
  labelKey?: TranslationKey;
  permission?: keyof AdminPermissions;
  items: NavLeaf[];
};

const NAV: NavSection[] = [
  {
    items: [{ href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard }],
  },
  {
    labelKey: "nav.section.store",
    permission: "orders",
    items: [
      { href: "/orders", labelKey: "nav.orders", icon: ShoppingCart },
      { href: "/orders/exchange", labelKey: "nav.exchange", icon: RotateCcw },
      { href: "/products", labelKey: "nav.products", icon: Package },
      { href: "/products/wanted", labelKey: "nav.wanted", icon: BellRing },
      { href: "/collections", labelKey: "nav.collections", icon: FolderTree },
      { href: "/products/inventory", labelKey: "nav.inventory", icon: Warehouse },
    ],
  },
  {
    labelKey: "nav.section.customers",
    permission: "customers",
    items: [
      { href: "/customers", labelKey: "nav.customers", icon: Users },
      { href: "/customers/segments", labelKey: "nav.segments", icon: UserSearch },
    ],
  },
  {
    labelKey: "nav.section.marketing",
    permission: "marketing",
    items: [
      { href: "/discounts", labelKey: "nav.discounts", icon: Tags },
      { href: "/notifications", labelKey: "nav.notifications", icon: Bell },
    ],
  },
  {
    labelKey: "nav.section.content",
    permission: "content",
    items: [
      { href: "/content", labelKey: "nav.content", icon: FileText },
    ],
  },
  {
    labelKey: "nav.section.support",
    permission: "content",
    items: [
      { href: "/chat/canned-responses", labelKey: "nav.cannedResponses", icon: MessageSquareText },
      { href: "/chat/automation", labelKey: "nav.automation", icon: Zap },
    ],
  },
  {
    labelKey: "nav.section.insights",
    permission: "analytics",
    items: [
      { href: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
    ],
  },
];

const BOTTOM: (NavLeaf & { permission?: keyof AdminPermissions })[] = [
  { href: "/settings/shipping", labelKey: "nav.shipping", icon: Truck, permission: "settings" },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function SidebarContent({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const [location] = useLocation();
  const { hasPermission } = useAdminAuth();
  const { t } = useT();

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    if (path === "/") return location === "/";
    // Exact-ish: avoid /products matching /products/inventory both as active
    if (path === "/products") return location === "/products" || (/^\/products\/[^/]+$/.test(location) && !location.startsWith("/products/inventory") && !location.startsWith("/products/wanted"));
    return location === path || location.startsWith(path + "/");
  };

  const renderLeaf = (item: NavLeaf) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const label = t(item.labelKey);

    const link = (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        data-testid={`nav-${item.href}`}
        className={cn(
          "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150",
          collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2",
          active
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        {active && !collapsed && (
          <span className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-primary-foreground/80" />
        )}
        <Icon className={cn("flex-shrink-0 transition-transform", collapsed ? "h-[18px] w-[18px]" : "h-[18px] w-[18px]", !active && "group-hover:scale-110")} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>{label}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  const visibleSections = NAV.filter((s) => !s.permission || hasPermission(s.permission));

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Brand */}
      <div className={cn("flex items-center h-16 border-b border-sidebar-border flex-shrink-0", collapsed ? "justify-center px-2" : "px-5 justify-between")}>
        {!collapsed ? (
          <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/30">
              <span className="text-primary-foreground font-extrabold text-lg leading-none">M</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[15px] tracking-tight text-foreground">Mora</span>
              <span className="text-[10px] text-muted-foreground font-medium">{t("app.admin")}</span>
            </div>
          </Link>
        ) : (
          <Link href="/" onClick={onNavigate} className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/30">
            <span className="text-primary-foreground font-extrabold text-lg leading-none">M</span>
          </Link>
        )}
        {onToggleCollapse && !collapsed && (
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            title={t("sidebar.collapse")}
          >
            <PanelLeftClose className="h-4 w-4 rtl:rotate-180" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-5", collapsed ? "px-2" : "px-3")}>
        {visibleSections.map((section, si) => (
          <div key={si} className="space-y-1">
            {section.labelKey && !collapsed && (
              <p className="px-3 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {t(section.labelKey)}
              </p>
            )}
            {section.labelKey && collapsed && si > 0 && (
              <div className="mx-auto my-2 h-px w-6 bg-sidebar-border" />
            )}
            <div className="space-y-0.5">
              {section.items.map(renderLeaf)}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className={cn("border-t border-sidebar-border py-3 space-y-0.5 flex-shrink-0", collapsed ? "px-2" : "px-3")}>
        {BOTTOM.filter((i) => !i.permission || hasPermission(i.permission)).map(renderLeaf)}
        {onToggleCollapse && collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex h-10 w-10 mx-auto items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-foreground transition-colors"
              >
                <PanelLeft className="h-[18px] w-[18px] rtl:rotate-180" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>{t("sidebar.expand")}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  return (
    <aside
      className={cn(
        "hidden md:flex border-e border-sidebar-border flex-shrink-0 flex-col h-screen sticky top-0 transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </aside>
  );
}
