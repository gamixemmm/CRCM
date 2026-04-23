"use client";
import { useSettings } from "@/lib/SettingsContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wrench, Plus, Search, CheckCircle, Car, XCircle, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { resolveMaintenance, unresolveMaintenance, deleteMaintenance } from "@/actions/maintenance";

const statusFilters = ["ALL", "ACTIVE", "COMPLETED"];

interface MaintenanceClientProps {
  logs: any[];
}

export default function MaintenanceClient({ logs }: MaintenanceClientProps) {
  const { formatPrice: formatCurrency, t, formatStatusT } = useSettings();

  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [resolving, setResolving] = useState<string | null>(null);

  const filtered = logs.filter((log) => {
    // ACTIVE means return date is missing, COMPLETED means returnDate exists
    const isActive = !log.returnDate;
    const matchesStatus = 
      statusFilter === "ALL" || 
      (statusFilter === "ACTIVE" && isActive) || 
      (statusFilter === "COMPLETED" && !isActive);
      
    const term = search.toLowerCase();
    const searchMatch =
      !search ||
      log.description.toLowerCase().includes(term) ||
      (log.serviceProvider && log.serviceProvider.toLowerCase().includes(term)) ||
      log.vehicle.plateNumber.toLowerCase().includes(term);
      
    return matchesStatus && searchMatch;
  });

  const handleResolve = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t("maintenance.resolveConfirm"))) {
      setResolving(id);
      const res = await resolveMaintenance(id);
      setResolving(null);
      if (res.success) {
        toast(t("maintenance.successMsg"), "success");
      } else {
        toast(res.message, "error");
      }
    }
  };

  const handleUnresolve = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t("maintenance.unresolveConfirm"))) {
      setResolving(id);
      const res = await unresolveMaintenance(id);
      setResolving(null);
      if (res.success) {
        toast(res.message, "success");
      } else {
        toast(res.message, "error");
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t("maintenance.deleteConfirm"))) {
      setResolving(id);
      const res = await deleteMaintenance(id);
      setResolving(null);
      if (res.success) {
        toast(res.message, "success");
      } else {
        toast(res.message, "error");
      }
    }
  };

  const columns = [
    {
      key: "vehicle",
      label: t("bookings.vehicle"),
      render: (log: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ padding: "8px", background: "var(--bg-tertiary)", borderRadius: "6px" }}>
            <Car size={16} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 600 }}>{log.vehicle.brand} {log.vehicle.model}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{log.vehicle.plateNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: "description",
      label: t("maintenance.serviceDesc"),
      render: (log: any) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600, color: "var(--accent)" }}>{log.type}</span>
          <span style={{ fontWeight: 500 }}>{log.description}</span>
          {log.partsUsed && log.partsUsed.length > 0 && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              {t("maintenance.parts")} {log.partsUsed.join(", ")}
            </span>
          )}
          {log.serviceProvider && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{t("maintenance.by")} {log.serviceProvider}</span>
          )}
        </div>
      ),
    },
    {
      key: "dates",
      label: t("maintenance.shopLogic"),
      render: (log: any) => (
        <div style={{ fontSize: "0.875rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", width: "160px" }}>
            <span style={{ color: "var(--text-secondary)" }}>{t("maintenance.in")}:</span>
            <span>{formatDate(log.serviceDate)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", width: "160px" }}>
            <span style={{ color: "var(--text-secondary)" }}>{t("maintenance.out")}:</span>
            <span style={{ fontWeight: log.returnDate ? 600 : "normal", color: log.returnDate ? "var(--success)" : "var(--text-tertiary)" }}>
              {log.returnDate ? formatDate(log.returnDate) : t("maintenance.stillInShop")}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "cost",
      label: t("maintenance.repairCost"),
      render: (log: any) => (
        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
          {formatCurrency(log.cost)}
        </span>
      ),
    },
    {
      key: "status",
      label: t("label.status"),
      render: (log: any) => (
        <Badge
          color={!log.returnDate ? "var(--warning)" : "var(--success)"}
          bg={!log.returnDate ? "rgba(234, 179, 8, 0.1)" : "rgba(34, 197, 94, 0.1)"}
          dot
        >
          {!log.returnDate ? t("status.active").toUpperCase() : t("status.completed").toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: t("label.actions"),
      align: "right" as const,
      render: (log: any) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          {!log.returnDate ? (
            <Button
              size="sm"
              variant="success"
              loading={resolving === log.id}
              onClick={(e) => handleResolve(log.id, e)}
              icon={<CheckCircle size={14} />}
            >
              {t("maintenance.resolve")}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={resolving === log.id}
              onClick={(e) => handleUnresolve(log.id, e)}
              icon={<XCircle size={14} />}
            >
              {t("maintenance.unresolve")}
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            loading={resolving === log.id}
            onClick={(e) => handleDelete(log.id, e)}
            icon={<Trash2 size={14} />}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>
          <Wrench size={24} />
          {t("maintenance.title")}
        </h1>
        <div className="page-header-actions">
          <Link href="/maintenance/new">
            <Button icon={<Plus size={16} />}>{t("maintenance.addRecord")}</Button>
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "250px", maxWidth: "400px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder={t("maintenance.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", height: "40px", padding: "0 12px 0 36px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
          />
        </div>

        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px",
                background: statusFilter === s ? "var(--accent-muted)" : "transparent",
                color: statusFilter === s ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${statusFilter === s ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s === "ALL" ? t("label.all") : formatStatusT(s)}
            </button>
          ))}
        </div>
      </div>

      <Table
        columns={columns}
        data={filtered}
        keyExtractor={(log) => log.id}
        emptyMessage={t("maintenance.noRecords")}
      />
    </div>
  );
}
