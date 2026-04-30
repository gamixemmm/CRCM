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
  ClipboardCheck,
  Shield,
  ClipboardList,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { TranslationKey } from "@/lib/translations";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import styles from "./Sidebar.module.css";
import type { LucideIcon } from "lucide-react";

const navItems: { labelKey: TranslationKey; href: string; icon: LucideIcon; permissions?: string[]; adminOnly?: boolean }[] = [
  { labelKey: "nav.dashboard", href: "/", icon: LayoutDashboard },
  { labelKey: "nav.vehicles", href: "/vehicles", icon: Car, permissions: ["VIEW_VEHICLES", "MANAGE_VEHICLES"] },
  { labelKey: "nav.bookings", href: "/bookings", icon: ClipboardList, permissions: ["VIEW_BOOKINGS", "MANAGE_BOOKINGS"] },
  { labelKey: "nav.calendar", href: "/calendar", icon: CalendarDays, permissions: ["VIEW_CALENDAR", "MANAGE_BOOKINGS"] },
  { labelKey: "nav.brokers", href: "/customers", icon: Users, permissions: ["VIEW_BROKERS", "MANAGE_BROKERS"] },
  { labelKey: "nav.invoices", href: "/invoices", icon: FileText, permissions: ["VIEW_INVOICES", "MANAGE_INVOICES"] },
  { labelKey: "nav.expenses", href: "/expenses", icon: TrendingDown, permissions: ["VIEW_EXPENSES", "MANAGE_EXPENSES"] },
  { labelKey: "nav.vignette", href: "/vignette", icon: ShieldCheck, permissions: ["VIEW_VIGNETTE", "MANAGE_VIGNETTE"] },
  { labelKey: "nav.insurance", href: "/insurance", icon: Shield, permissions: ["VIEW_INSURANCE", "MANAGE_INSURANCE"] },
  { labelKey: "nav.technicalInspection", href: "/technical-inspection", icon: ClipboardCheck, permissions: ["VIEW_TECHNICAL_INSPECTION", "MANAGE_TECHNICAL_INSPECTION"] },
  { labelKey: "nav.employees", href: "/employees", icon: BriefcaseBusiness, permissions: ["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES"] },
  { labelKey: "nav.maintenance", href: "/maintenance", icon: Wrench, permissions: ["VIEW_MAINTENANCE", "MANAGE_MAINTENANCE"] },
  { labelKey: "nav.settings", href: "/settings", icon: Settings },
];

type AttentionCounts = {
  technicalInspection: number;
  vignette: number;
  insurance: number;
  employeeSalary: number;
};

const attentionCacheTtl = 60 * 1000;

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [session, setSession] = useState<{ id?: string; companyId?: string; role?: string; permissions?: string[]; companyName?: string } | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [technicalInspectionAttention, setTechnicalInspectionAttention] = useState(0);
  const [vignetteAttention, setVignetteAttention] = useState(0);
  const [insuranceAttention, setInsuranceAttention] = useState(0);
  const [employeeSalaryAttention, setEmployeeSalaryAttention] = useState(0);
  const { t } = useSettings();

  useEffect(() => {
    getCompanyAdminSession().then((s) => {
      setSession(s);
      setSessionLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!sessionLoaded) return;

    let cancelled = false;
    const cacheKey = session?.companyId && session?.id
      ? `crmss.attention.${session.companyId}.${session.id}`
      : "crmss.attention.anonymous";

    const applyCounts = (counts: AttentionCounts) => {
      setTechnicalInspectionAttention(counts.technicalInspection);
      setVignetteAttention(counts.vignette);
      setInsuranceAttention(counts.insurance);
      setEmployeeSalaryAttention(counts.employeeSalary);
    };

    const readCachedCounts = () => {
      try {
        const raw = window.sessionStorage.getItem(cacheKey);
        if (!raw) return null;
        const cached = JSON.parse(raw) as { savedAt: number; counts: AttentionCounts };
        if (Date.now() - cached.savedAt > attentionCacheTtl) return null;
        return cached.counts;
      } catch {
        return null;
      }
    };

    const writeCachedCounts = (counts: AttentionCounts) => {
      window.sessionStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), counts }));
    };

    const loadAttentionCount = async (forceRefresh = false) => {
      if (!forceRefresh) {
        const cached = readCachedCounts();
        if (cached) {
          applyCounts(cached);
          return;
        }
      }

      try {
        const [technicalResponse, vignetteResponse, insuranceResponse, employeeSalaryResponse] = await Promise.all([
          fetch("/api/technical-inspection/attention", { cache: "no-store" }),
          fetch("/api/vignette/attention", { cache: "no-store" }),
          fetch("/api/insurance/attention", { cache: "no-store" }),
          fetch("/api/employees/salary-attention", { cache: "no-store" }),
        ]);

        const technicalData = technicalResponse.ok ? await technicalResponse.json() : { attentionCount: 0 };
        const vignetteData = vignetteResponse.ok ? await vignetteResponse.json() : { attentionCount: 0 };
        const insuranceData = insuranceResponse.ok ? await insuranceResponse.json() : { attentionCount: 0 };
        const employeeSalaryData = employeeSalaryResponse.ok ? await employeeSalaryResponse.json() : { attentionCount: 0 };

        if (!cancelled) {
          const counts = {
            technicalInspection: technicalData.attentionCount || 0,
            vignette: vignetteData.attentionCount || 0,
            insurance: insuranceData.attentionCount || 0,
            employeeSalary: employeeSalaryData.attentionCount || 0,
          };
          applyCounts(counts);
          writeCachedCounts(counts);
        }
      } catch {
        if (!cancelled) {
          applyCounts({ technicalInspection: 0, vignette: 0, insurance: 0, employeeSalary: 0 });
        }
      }
    };

    loadAttentionCount();
    const loadCachedOrFresh = () => loadAttentionCount();
    const forceLoadFresh = () => loadAttentionCount(true);
    window.addEventListener("focus", loadCachedOrFresh);
    window.addEventListener("technical-inspection:updated", forceLoadFresh);
    window.addEventListener("vignette:updated", forceLoadFresh);
    window.addEventListener("insurance:updated", forceLoadFresh);
    window.addEventListener("employees:updated", forceLoadFresh);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadCachedOrFresh);
      window.removeEventListener("technical-inspection:updated", forceLoadFresh);
      window.removeEventListener("vignette:updated", forceLoadFresh);
      window.removeEventListener("insurance:updated", forceLoadFresh);
      window.removeEventListener("employees:updated", forceLoadFresh);
    };
  }, [session, sessionLoaded]);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Car size={22} />
        </div>
        {!collapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoTitle} title={session?.companyName || "CRMS"}>
              {session?.companyName || "CRMS"}
            </span>
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
              if (item.adminOnly && session?.role !== "Administrator") return null;
              if (item.permissions && !canPerform(session, item.permissions)) {
                return null;
              }

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
                    {item.href === "/technical-inspection" && technicalInspectionAttention > 0 && (
                      <span className={styles.attentionBadge}>
                        {collapsed ? "" : technicalInspectionAttention}
                      </span>
                    )}
                    {item.href === "/vignette" && vignetteAttention > 0 && (
                      <span className={styles.attentionBadge}>
                        {collapsed ? "" : vignetteAttention}
                      </span>
                    )}
                    {item.href === "/insurance" && insuranceAttention > 0 && (
                      <span className={styles.attentionBadge}>
                        {collapsed ? "" : insuranceAttention}
                      </span>
                    )}
                    {item.href === "/employees" && employeeSalaryAttention > 0 && (
                      <span className={styles.attentionBadge}>
                        {collapsed ? "" : employeeSalaryAttention}
                      </span>
                    )}
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
