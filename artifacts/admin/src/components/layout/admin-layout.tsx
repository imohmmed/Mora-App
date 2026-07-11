import { ReactNode, useState, useEffect } from "react";
import { Sidebar, SidebarContent } from "./sidebar";
import { TopBar } from "./top-bar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const COLLAPSE_KEY = "mora_admin_sidebar_collapsed";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex w-full">
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col rtl:[&>button]:left-4 rtl:[&>button]:right-auto">
          <SidebarContent onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <TopBar onMenuClick={() => setMobileSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}
