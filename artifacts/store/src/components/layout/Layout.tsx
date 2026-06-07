import React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
