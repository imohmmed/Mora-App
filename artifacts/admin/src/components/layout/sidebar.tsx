import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FolderTree,
  Tags,
  Megaphone,
  FileText,
  Globe,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronRight,
  UserSearch,
  Boxes,
  File,
  List as ListIcon,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavLeaf = { href: string; label: string; icon?: React.ElementType };
type NavSection = {
  label?: string;
  items: (NavLeaf & { icon: React.ElementType })[];
  sub?: NavLeaf[];
};

const NAV: NavSection[] = [
  {
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Store",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/products", label: "Products", icon: Package },
      { href: "/collections", label: "Collections", icon: FolderTree },
    ],
    sub: [
      { href: "/products/inventory", label: "Inventory", icon: Warehouse },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/customers", label: "All Customers", icon: Users },
    ],
    sub: [
      { href: "/customers/segments", label: "Segments", icon: UserSearch },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/discounts", label: "Discounts", icon: Tags },
      { href: "/campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/content", label: "Blog Posts", icon: FileText },
    ],
    sub: [
      { href: "/content?tab=menus", label: "Menus", icon: ListIcon },
      { href: "/content?tab=metaobjects", label: "Metaobjects", icon: Boxes },
      { href: "/content?tab=files", label: "Files", icon: File },
    ],
  },
  {
    label: "Markets & Analytics",
    items: [
      { href: "/markets", label: "Markets", icon: Globe },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
];

const BOTTOM: (NavLeaf & { icon: React.ElementType })[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarContent() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    return path === "/" ? location === "/" : location.startsWith(path);
  };

  const toggleSection = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderLeaf = (item: NavLeaf & { icon?: React.ElementType }, indent = false) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(
          "flex items-center gap-2.5 rounded-md text-sm font-medium transition-colors",
          indent ? "py-1.5 px-3 ml-3" : "py-2 px-3",
          active
            ? "bg-primary text-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        {Icon && <Icon className={cn("flex-shrink-0", indent ? "h-3.5 w-3.5" : "h-4 w-4")} />}
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2 border-b flex-shrink-0">
        <span className="font-bold text-xl text-foreground tracking-tight">Mora</span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map((section, si) => {
          const isCollapsed = section.label ? collapsed[section.label] : false;
          return (
            <div key={si} className={cn("space-y-0.5", si > 0 && "pt-2")}>
              {section.label && (
                <button
                  onClick={() => toggleSection(section.label!)}
                  className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  {section.label}
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map((item) => renderLeaf(item))}
                  {section.sub && (
                    <div className="space-y-0.5 mt-0.5">
                      {section.sub.map((item) => renderLeaf(item, true))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t flex-shrink-0">
        {BOTTOM.map((item) => renderLeaf(item))}
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 border-r bg-sidebar flex-shrink-0 flex-col h-screen sticky top-0">
      <SidebarContent />
    </aside>
  );
}
