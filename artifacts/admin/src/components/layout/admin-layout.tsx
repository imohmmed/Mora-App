import { ReactNode, useState } from "react";
import { Sidebar, SidebarContent } from "./sidebar";
import { TopBar } from "./top-bar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex w-full">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-60 p-0 flex flex-col">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <TopBar onMenuClick={() => setMobileSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
