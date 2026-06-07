import { ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex w-full">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}