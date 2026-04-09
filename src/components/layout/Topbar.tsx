"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";
import { TranslationKey } from "@/lib/translations";
import styles from "./Topbar.module.css";

interface TopbarProps {
  onMenuClick?: () => void;
}

const pageTitleKeys: Record<string, TranslationKey> = {
  "/": "nav.dashboard",
  "/vehicles": "nav.vehicles",
  "/bookings": "nav.bookings",
  "/calendar": "nav.calendar",
  "/customers": "nav.brokers",
  "/invoices": "nav.invoices",
  "/maintenance": "nav.maintenance",
  "/settings": "nav.settings",
};

function getPageTitleKey(pathname: string): TranslationKey {
  if (pageTitleKeys[pathname]) return pageTitleKeys[pathname];

  // Match nested routes
  for (const [key, titleKey] of Object.entries(pageTitleKeys)) {
    if (key !== "/" && pathname.startsWith(key)) return titleKey;
  }

  return "nav.dashboard";
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { t } = useSettings();
  const title = t(getPageTitleKey(pathname));

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          className={styles.menuBtn}
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <h2 className={styles.title}>{title}</h2>
      </div>

      <div className={styles.right}>
        {/* Search */}
        <div className={styles.search}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder={t("topbar.search")}
            className={styles.searchInput}
            id="global-search"
          />
          <kbd className={styles.searchKbd}>⌘K</kbd>
        </div>

        {/* Notifications */}
        <button className={styles.iconBtn} aria-label="Notifications" id="notifications-btn">
          <Bell size={18} />
          <span className={styles.notifDot} />
        </button>

        {/* User */}
        <div className={styles.user}>
          <div className={styles.avatar}>A</div>
        </div>
      </div>
    </header>
  );
}
