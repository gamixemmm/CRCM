"use client";
import { useSettings } from "@/lib/SettingsContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wrench, Plus, Search, CheckCircle, Car, XCircle, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { formatMaintenanceEntries, translateMaintenanceText } from "@/lib/maintenanceDetails";
import { resolveMaintenance, unresolveMaintenance, deleteMaintenance } from "@/actions/maintenance";
import styles from "./maintenance.module.css";

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
          <span style={{ fontWeight: 600, color: "var(--accent)" }}>{translateMaintenanceText(log.type, t)}</span>
          <span style={{ fontWeight: 500 }}>{translateMaintenanceText(log.description, t)}</span>
          {log.partsUsed && log.partsUsed.length > 0 && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              {t("maintenance.parts")} {formatMaintenanceEntries(log.partsUsed, "", t)}
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

  const mobileCards = filtered.map((log) => {
    const isActive = !log.returnDate;
    return (
      <Card
        key={log.id}
        hover
        padding="md"
        className={styles.mobileCard}
        onClick={() => router.push(`/maintenance/${log.id}`)}
      >
        <div className={styles.mobileCardTop}>
          <div className={styles.mobileVehicle}>
            <div className={styles.mobileVehicleName}>{log.vehicle.brand} {log.vehicle.model}</div>
            <div className={styles.mobileVehiclePlate}>{log.vehicle.plateNumber}</div>
          </div>
          <Badge color={!isActive ? "var(--success)" : "var(--warning)"} bg={!isActive ? "rgba(34, 197, 94, 0.1)" : "rgba(234, 179, 8, 0.1)"} dot>
            {!isActive ? t("status.completed").toUpperCase() : t("status.active").toUpperCase()}
          </Badge>
        </div>
        <div style={{ fontWeight: 700, color: "var(--accent)" }}>{translateMaintenanceText(log.type, t)}</div>
        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{translateMaintenanceText(log.description, t)}</div>
        <div className={styles.mobileMetaGrid}>
          <div className={styles.mobileMetaItem}>
            <span className={styles.mobileMetaLabel}>{t("maintenance.in")}</span>
            <span className={styles.mobileMetaValue}>{formatDate(log.serviceDate)}</span>
          </div>
          <div className={styles.mobileMetaItem}>
            <span className={styles.mobileMetaLabel}>{t("maintenance.out")}</span>
            <span className={styles.mobileMetaValue}>{log.returnDate ? formatDate(log.returnDate) : t("maintenance.stillInShop")}</span>
          </div>
          <div className={styles.mobileMetaItem}>
            <span className={styles.mobileMetaLabel}>{t("maintenance.repairCost")}</span>
            <span className={styles.mobileMetaValue}>{formatCurrency(log.cost)}</span>
          </div>
          <div className={styles.mobileMetaItem}>
            <span className={styles.mobileMetaLabel}>{t("label.actions")}</span>
            <span className={styles.mobileMetaValue}>{t("action.view")}</span>
          </div>
        </div>
        <div className={styles.mobileFooter} onClick={(e) => e.stopPropagation()}>
          <div style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
            {log.serviceProvider ? `${t("maintenance.by")} ${log.serviceProvider}` : ""}
          </div>
          <div className={styles.mobileActions}>
            {!isActive ? (
              <Button size="sm" variant="secondary" loading={resolving === log.id} icon={<XCircle size={14} />} onClick={(e) => handleUnresolve(log.id, e)}>
                {t("maintenance.unresolve")}
              </Button>
            ) : (
              <Button size="sm" variant="success" loading={resolving === log.id} icon={<CheckCircle size={14} />} onClick={(e) => handleResolve(log.id, e)}>
                {t("maintenance.resolve")}
              </Button>
            )}
            <Button size="sm" variant="danger" loading={resolving === log.id} icon={<Trash2 size={14} />} onClick={(e) => handleDelete(log.id, e)} />
          </div>
        </div>
      </Card>
    );
  });

  return (
    <div className="animate-fade-in">
      <div className={`page-header ${styles.pageHeader}`}>
        <h1>
          <Wrench size={24} />
          {t("maintenance.title")}
        </h1>
        <div className={styles.detailActions}>
          <Link href="/maintenance/new">
            <Button icon={<Plus size={16} />}>{t("maintenance.addRecord")}</Button>
          </Link>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder={t("maintenance.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterRow}>
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`${styles.filterButton} ${statusFilter === s ? styles.filterButtonActive : ""}`}
            >
              {s === "ALL" ? t("label.all") : formatStatusT(s)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.desktopTable}>
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(log) => log.id}
          onRowClick={(log) => router.push(`/maintenance/${log.id}`)}
          emptyMessage={t("maintenance.noRecords")}
        />
      </div>

      <div className={styles.mobileList}>
        {mobileCards}
        {filtered.length === 0 && (
          <div className={`empty-state ${styles.mobileEmpty}`}>
            <Wrench size={44} />
            <h3>{t("maintenance.noRecords")}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
