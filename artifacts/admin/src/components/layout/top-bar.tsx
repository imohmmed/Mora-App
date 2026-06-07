import { Bell, Search, Store, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/orders": "Orders",
  "/products": "Products",
  "/products/inventory": "Inventory",
  "/products/purchase-orders": "Purchase Orders",
  "/products/transfers": "Transfers",
  "/products/gift-cards": "Gift Cards",
  "/customers": "Customers",
  "/customers/segments": "Customer Segments",
  "/customers/companies": "Companies",
  "/collections": "Collections",
  "/discounts": "Discounts",
  "/campaigns": "Campaigns",
  "/content": "Content",
  "/markets": "Markets",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

function getTitle(path: string): string {
  if (PAGE_TITLES[path]) return PAGE_TITLES[path];
  if (path.startsWith("/orders/")) return "Order Details";
  if (path.startsWith("/products/")) return "Product Details";
  if (path.startsWith("/customers/")) return "Customer Profile";
  return "Mora Admin";
}

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [location] = useLocation();
  const title = getTitle(location);

  return (
    <header className="h-14 border-b bg-background flex items-center gap-3 px-4 flex-shrink-0 sticky top-0 z-10">
      {/* Hamburger — mobile only */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <span className="font-semibold text-sm text-muted-foreground hidden md:block">{title}</span>

      <div className="flex-1" />

      {/* Search — desktop */}
      <div className="relative hidden md:block w-56 lg:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-9 h-8 text-sm bg-muted border-0 focus-visible:ring-1"
        />
      </div>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative h-8 w-8">
        <Bell className="h-4 w-4" />
        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
          3
        </Badge>
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">MA</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Mora Admin</p>
              <p className="text-xs leading-none text-muted-foreground">admin@mora.store</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Store className="mr-2 h-4 w-4" />
            View Store
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-muted-foreground">Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
