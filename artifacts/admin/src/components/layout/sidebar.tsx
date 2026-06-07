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
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/collections", label: "Collections", icon: FolderTree },
  { href: "/discounts", label: "Discounts", icon: Tags },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/markets", label: "Markets", icon: Globe },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  const renderLink = (item: typeof navItems[0]) => {
    const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
    
    return (
      <Link 
        key={item.href} 
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive 
            ? "bg-primary text-primary-foreground" 
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
        data-testid={`nav-${item.label.toLowerCase()}`}
      >
        <item.icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="w-64 border-r bg-sidebar flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 md:p-6 flex items-center">
        <span className="font-bold text-xl text-foreground tracking-tight">Mora</span>
        <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">Admin</span>
      </div>
      <div className="px-3 flex-1 flex flex-col gap-1">
        {navItems.map(renderLink)}
      </div>
      <div className="p-3 mt-auto">
        {bottomItems.map(renderLink)}
      </div>
    </aside>
  );
}