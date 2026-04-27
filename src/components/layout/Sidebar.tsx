"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  CalendarDays,
  Users,
  FileText,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  BriefcaseBusiness,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { TranslationKey } from "@/lib/translations";
import styles from "./Sidebar.module.css";

const navItems: { labelKey: TranslationKey; href: string; icon: any }[] = [
  { labelKey: "nav.dashboard", href: "/", icon: LayoutDashboard },
  { labelKey: "nav.vehicles", href: "/vehicles", icon: Car },
  { labelKey: "nav.bookings", href: "/bookings", icon: CalendarDays },
  { labelKey: "nav.calendar", href: "/calendar", icon: CalendarDays },
  { labelKey: "nav.brokers", href: "/customers", icon: Users },
  { labelKey: "nav.invoices", href: "/invoices", icon: FileText },
  { labelKey: "nav.expenses", href: "/expenses", icon: TrendingDown },
  { labelKey: "nav.vignette", href: "/vignette", icon: ShieldCheck },
  { labelKey: "nav.employees", href: "/employees", icon: BriefcaseBusiness },
  { labelKey: "nav.maintenance", href: "/maintenance", icon: Wrench },
  { labelKey: "nav.settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useSettings();

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Car size={22} />
        </div>
        {!collapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>CRMS</span>
            <span className={styles.logoSub}>Car Rental</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navSection}>
          {!collapsed && <span className={styles.navLabel}>{t("nav.menu")}</span>}
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              const label = t(item.labelKey);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                    title={collapsed ? label : undefined}
                  >
                    <Icon size={20} />
                    {!collapsed && <span>{label}</span>}
                    {isActive && <div className={styles.activeIndicator} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Collapse Toggle */}
      <button
        className={styles.collapseBtn}
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
