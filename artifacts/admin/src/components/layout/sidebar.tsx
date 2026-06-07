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
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
  children?: {
    href: string;
    label: string;
    icon?: React.ElementType;
  }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/products", label: "Products", icon: Package },
      { href: "/collections", label: "Collections", icon: FolderTree },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/customers", label: "All Customers", icon: Users },
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
    label: "Content & Markets",
    items: [
      { href: "/content", label: "Content", icon: FileText },
      { href: "/markets", label: "Markets", icon: Globe },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderItem = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="w-60 border-r bg-sidebar flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto">
      <div className="px-4 py-5 flex items-center gap-2 border-b">
        <span className="font-bold text-xl text-foreground tracking-tight">Mora</span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
          Admin
        </span>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1">
        {NAV_GROUPS.map((group, gi) => {
          const isCollapsed = group.label ? collapsed[group.label] : false;
          return (
            <div key={gi} className="space-y-0.5">
              {group.label && (
                <button
                  onClick={() => toggleGroup(group.label!)}
                  className="w-full flex items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  {group.label}
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map(renderItem)}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t">
        {BOTTOM_ITEMS.map(renderItem)}
      </div>
    </aside>
  );
}
