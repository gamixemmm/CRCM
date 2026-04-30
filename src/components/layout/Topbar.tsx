"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CheckCheck, Menu, Search, LogOut } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";
import { TranslationKey } from "@/lib/translations";
import { getCompanyAdminSession, companyAdminLogout } from "@/actions/companyAuth";
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
  "/expenses": "nav.expenses",
  "/vignette": "nav.vignette",
  "/insurance": "nav.insurance",
  "/technical-inspection": "nav.technicalInspection",
  "/employees": "nav.employees",
  "/maintenance": "nav.maintenance",
  "/settings": "nav.settings",
  "/developer": "nav.settings",
};

type Notification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

const defaultNotifications: Notification[] = [
  {
    id: "welcome-all",
    title: "Welcome",
    message: "Welcome all. Notifications are now ready and more alerts will appear here later.",
    createdAt: new Date().toISOString(),
    read: false,
  },
];

const notificationsStorageKey = "crmss.notifications";

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
  const router = useRouter();
  const { t } = useSettings();
  const title = t(getPageTitleKey(pathname));
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(defaultNotifications);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [session, setSession] = useState<{name: string, companyName: string, email: string, role?: string} | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCompanyAdminSession().then(setSession);
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(notificationsStorageKey);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch {
      setNotifications(defaultNotifications);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(notificationsStorageKey, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (
        searchRef.current &&
        searchPanelRef.current &&
        !searchRef.current.contains(event.target as Node) &&
        !searchPanelRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        setSearchResults(data.results || []);
        setSearchOpen(true);
      } catch {
        if (!controller.signal.aborted) {
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  };

  const openSearchResult = (href: string) => {
    setSearchQuery("");
    setSearchOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    await companyAdminLogout();
    router.refresh();
  };

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
        <div className={styles.search} ref={searchRef}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder={t("topbar.search")}
            className={styles.searchInput}
            id="global-search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) setSearchOpen(true);
            }}
          />
          <kbd className={styles.searchKbd}>⌘K</kbd>
        </div>

        {searchOpen && searchQuery.trim().length >= 2 && (
          <div className={styles.searchPanel} ref={searchPanelRef}>
            <div className={styles.searchPanelHeader}>
              Search results for "{searchQuery.trim()}"
            </div>
            {searchLoading ? (
              <div className={styles.searchEmpty}>Searching...</div>
            ) : searchResults.length > 0 ? (
              <div className={styles.searchResults}>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className={styles.searchResult}
                    onClick={() => openSearchResult(result.href)}
                  >
                    <span className={styles.searchResultType}>{result.type}</span>
                    <span className={styles.searchResultText}>
                      <span className={styles.searchResultTitle}>{result.title}</span>
                      <span className={styles.searchResultSubtitle}>{result.subtitle}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.searchEmpty}>No results found.</div>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className={styles.notifications} ref={notificationRef}>
          <button
            className={styles.iconBtn}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            id="notifications-btn"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className={styles.notifDot} />}
          </button>

          {notificationsOpen && (
            <div className={styles.notificationsPanel}>
              <div className={styles.notificationsHeader}>
                <div>
                  <div className={styles.notificationsTitle}>Notifications</div>
                  <div className={styles.notificationsMeta}>
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.markAllBtn}
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <CheckCheck size={14} />
                  Read all
                </button>
              </div>

              <div className={styles.notificationsList}>
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={`${styles.notificationItem} ${notification.read ? styles.notificationRead : ""}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <span className={styles.notificationIndicator} />
                    <span className={styles.notificationContent}>
                      <span className={styles.notificationTitle}>{notification.title}</span>
                      <span className={styles.notificationMessage}>{notification.message}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className={styles.user} ref={userMenuRef}>
          <div className={styles.avatar} onClick={() => setUserMenuOpen(!userMenuOpen)}>
            {session ? session.name.charAt(0).toUpperCase() : "A"}
          </div>
          
          {userMenuOpen && (
            <div className={styles.userMenu}>
              <div className={styles.userMenuHeader}>
                <div className={styles.userMenuName}>{session?.name || "Admin"}</div>
                <div className={styles.userMenuCompany} style={{ color: "var(--accent)" }}>{session?.role || "Administrator"}</div>
                <div className={styles.userMenuCompany}>{session?.companyName || "Loading..."}</div>
                <div className={styles.userMenuCompany}>{session?.email || ""}</div>
              </div>
              <div className={styles.userMenuBody}>
                <button type="button" className={styles.userMenuItem} onClick={handleLogout}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
