"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Plus, Search, FileText } from "lucide-react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { getFullName, formatDate } from "@/lib/utils";
import { useSettings } from "@/lib/SettingsContext";

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
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: "bold" }}>
            {c.firstName.charAt(0)}{c.lastName.charAt(0)}
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
          <div>{c.phone || "—"}</div>
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
          <span>{c.licenseNumber || "—"}</span>
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

  return (
    <div className="animate-fade-in">
      <div className="page-header">
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

      <div style={{ marginBottom: "24px", position: "relative", maxWidth: "400px" }}>
        <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
        <input
          type="text"
          placeholder={t("customers.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", height: "40px", padding: "0 12px 0 36px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
        />
      </div>

      <Table
        columns={columns}
        data={filtered}
        keyExtractor={(c) => c.id}
        onRowClick={(c) => router.push(`/customers/${c.id}`)}
        emptyMessage={t("customers.noCustomers")}
      />
    </div>
  );
}
