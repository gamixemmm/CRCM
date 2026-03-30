"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";
import styles from "./Topbar.module.css";

interface TopbarProps {
  onMenuClick?: () => void;
}

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/vehicles": "Fleet Management",
  "/bookings": "Bookings",
  "/customers": "Customers",
  "/invoices": "Invoices",
  "/maintenance": "Maintenance",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];

  // Match nested routes
  for (const [key, title] of Object.entries(pageTitles)) {
    if (key !== "/" && pathname.startsWith(key)) return title;
  }

  return "CRMS";
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

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
            placeholder="Search..."
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
