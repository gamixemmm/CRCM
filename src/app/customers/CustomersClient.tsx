"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Plus, Search, FileText, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import { getFullName, formatDate } from "@/lib/utils";
import { useSettings } from "@/lib/SettingsContext";
import styles from "./customers.module.css";

interface CustomersClientProps {
  customers: any[];
}

export default function CustomersClient({ customers }: CustomersClientProps) {
  const router = useRouter();
  const { t } = useSettings();
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => {
    const term = search.toLowerCase();
    return (
      !search ||
      c.firstName.toLowerCase().includes(term) ||
      c.lastName.toLowerCase().includes(term) ||
      (c.licenseNumber && c.licenseNumber.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
  });

  const columns = [
    {
      key: "name",
      label: t("customers.broker"),
      render: (c: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "var(--accent-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
              fontWeight: "bold",
            }}
          >
            {c.firstName.charAt(0)}
            {c.lastName.charAt(0)}
          </div>
          <div style={{ fontWeight: 600 }}>{getFullName(c.firstName, c.lastName)}</div>
        </div>
      ),
    },
    {
      key: "contact",
      label: t("customers.contact"),
      render: (c: any) => (
        <div>
          <div>{c.phone || "-"}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{c.email || t("customers.noEmail")}</div>
        </div>
      ),
    },
    {
      key: "license",
      label: t("customers.licenseNumber"),
      render: (c: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <FileText size={14} style={{ color: "var(--text-tertiary)" }} />
          <span>{c.licenseNumber || "-"}</span>
        </div>
      ),
    },
    {
      key: "joined",
      label: t("customers.joined"),
      render: (c: any) => <span style={{ color: "var(--text-secondary)" }}>{formatDate(c.createdAt)}</span>,
    },
    {
      key: "bookings",
      label: t("customers.totalBookings"),
      align: "center" as const,
      render: (c: any) => <span style={{ fontWeight: 600 }}>{c._count.bookings}</span>,
    },
  ];

  const mobileCards = filtered.map((c) => (
    <Card
      key={c.id}
      hover
      padding="md"
      className={styles.mobileCard}
      onClick={() => router.push(`/customers/${c.id}`)}
    >
      <div className={styles.mobileCardHeader}>
        <div className={styles.mobileTitle}>
          <div className={styles.mobileAvatarRow}>
            <div className={styles.mobileAvatar}>
              {c.firstName.charAt(0)}
              {c.lastName.charAt(0)}
            </div>
            <div className={styles.mobileName}>{getFullName(c.firstName, c.lastName)}</div>
          </div>
          <div className={styles.mobilePlate}>{c.phone || c.email || t("customers.noEmail")}</div>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0, marginTop: "4px" }} />
      </div>

      <div className={styles.mobileMetaGrid}>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("customers.contact")}</span>
          <span className={styles.mobileMetaValue}>
            {c.phone || "-"}
            <br />
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{c.email || t("customers.noEmail")}</span>
          </span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("customers.licenseNumber")}</span>
          <span className={styles.mobileMetaValue}>{c.licenseNumber || "-"}</span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("customers.joined")}</span>
          <span className={styles.mobileMetaValue}>{formatDate(c.createdAt)}</span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("customers.totalBookings")}</span>
          <span className={styles.mobileMetaValue}>{c._count.bookings}</span>
        </div>
      </div>
    </Card>
  ));

  return (
    <div className="animate-fade-in">
      <div className={`page-header ${styles.pageHeader}`}>
        <h1>
          <Users size={24} />
          {t("customers.title")}
        </h1>
        <div className="page-header-actions">
          <Link href="/customers/new">
            <Button icon={<Plus size={16} />}>{t("customers.addCustomer")}</Button>
          </Link>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
            }}
          />
          <input
            type="text"
            placeholder={t("customers.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.desktopTable}>
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(c) => c.id}
          onRowClick={(c) => router.push(`/customers/${c.id}`)}
          emptyMessage={t("customers.noCustomers")}
        />
      </div>

      <div className={styles.mobileList}>
        {mobileCards}
        {filtered.length === 0 && (
          <div className={`empty-state ${styles.mobileEmpty}`}>
            <Users size={44} />
            <h3>{t("customers.noCustomers")}</h3>
            <p>{t("customers.searchPlaceholder")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
