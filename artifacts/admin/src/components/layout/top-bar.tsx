import { Search, Menu, LogOut, Store, Sun, Moon, Languages } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import { cn } from "@/lib/utils";

const PAGE_TITLE_KEYS: Record<string, TranslationKey> = {
  "/": "nav.dashboard",
  "/orders": "nav.orders",
  "/products": "nav.products",
  "/products/inventory": "nav.inventory",
  "/products/purchase-orders": "nav.purchaseOrders",
  "/products/transfers": "nav.transfers",
  "/products/gift-cards": "nav.giftCards",
  "/customers": "nav.customers",
  "/customers/segments": "nav.segments",
  "/customers/companies": "nav.companies",
  "/collections": "nav.collections",
  "/discounts": "nav.discounts",
  "/notifications": "nav.notifications",
  "/content": "nav.content",
  "/analytics": "nav.analytics",
  "/settings": "nav.settings",
  "/settings/shipping": "nav.shipping",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase() || "?";
}

function LanguageSwitcher() {
  const { lang, setLang } = useT();
  return (
    <div className="flex items-center rounded-lg bg-muted p-0.5 h-8">
      {(["ar", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn(
            "px-2.5 h-7 rounded-md text-xs font-semibold transition-all",
            lang === l ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {l === "ar" ? "ع" : "EN"}
        </button>
      ))}
    </div>
  );
}

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [location] = useLocation();
  const { user, logout, isOwner } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useT();

  const path = location.split("?")[0].split("#")[0];
  const titleKey =
    PAGE_TITLE_KEYS[path] ??
    (path.startsWith("/orders/") ? "nav.orders" :
     path.startsWith("/products/") ? "nav.products" :
     path.startsWith("/customers/") ? "nav.customers" :
     path.startsWith("/collections/") ? "nav.collections" :
     path.startsWith("/discounts/") ? "nav.discounts" :
     path.startsWith("/content/") ? "nav.content" :
     path.startsWith("/settings/") ? "nav.settings" : "app.admin");

  return (
    <header className="h-16 border-b bg-background/80 backdrop-blur-md flex items-center gap-2 px-4 md:px-6 flex-shrink-0 sticky top-0 z-20">
      <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <h1 className="font-bold text-lg tracking-tight hidden sm:block">{t(titleKey)}</h1>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden lg:block w-64 xl:w-80">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("topbar.search")}
          className="ps-9 h-9 text-sm bg-muted border-0 focus-visible:ring-1 focus-visible:bg-background transition-colors"
        />
      </div>

      <LanguageSwitcher />

      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme} title={theme === "dark" ? t("topbar.lightMode") : t("topbar.darkMode")}>
        {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 ps-1.5 pe-2.5 gap-2 rounded-full">
            <Avatar className="h-7 w-7">
              {user?.picture && <AvatarImage src={user.picture} alt={user.name} />}
              <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                {user ? initials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">{user?.name || t("topbar.adminFallback")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none flex items-center gap-1.5">
                {user?.name || t("topbar.adminFallback")}
                {isOwner && (
                  <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {t("topbar.owner")}
                  </span>
                )}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/store" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
              <Store className="me-2 h-4 w-4" />
              {t("topbar.viewStore")}
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
            <LogOut className="me-2 h-4 w-4" />
            {t("topbar.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
