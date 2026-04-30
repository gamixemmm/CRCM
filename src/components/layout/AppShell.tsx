"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import MobileNav from "@/components/layout/MobileNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/developer") {
    return <main>{children}</main>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Sidebar />
      </MobileNav>
      <div className="app-main">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
