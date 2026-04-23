"use client";
import { useSettings } from "@/lib/SettingsContext";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Car,
  Filter,
  LayoutGrid,
  List,
  Fuel,
  Gauge,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import { formatStatus, getStatusColor, getStatusBg, formatMileage } from "@/lib/utils";
import styles from "./vehicles.module.css";

const statusFilters = ["ALL", "AVAILABLE", "RENTED", "MAINTENANCE", "OUT_OF_SERVICE"];

type VehicleRow = {
  id: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  transmission: string;
  fuelType: string;
  dailyRate: number;
  mileage: number;
  status: string;
  imageUrl: string | null;
  _count: { bookings: number };
  bookings?: { id: string }[];
  maintenance?: { mileageAtService: number | null }[];
};

interface VehiclesClientProps {
  vehicles: VehicleRow[];
  stats: { total: number; available: number; rented: number; maintenance: number };
}

export default function VehiclesClient({ vehicles, stats }: VehiclesClientProps) {
  const { formatPrice: formatCurrency, t, formatStatusT } = useSettings();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam && statusFilters.includes(statusParam.toUpperCase())) {
      setStatusFilter(statusParam.toUpperCase());
    }
  }, [searchParams]);

  const filtered = vehicles.filter((v) => {
    const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
    const matchesSearch =
      !search ||
      `${v.brand} ${v.model} ${v.plateNumber}`
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statCards = [
    { label: t("dashboard.totalVehicles"), value: stats.total, color: "var(--text-primary)", icon: <Car size={20} /> },
    { label: t("status.available"), value: stats.available, color: "var(--success)", icon: <Car size={20} /> },
    { label: t("status.rented"), value: stats.rented, color: "var(--accent)", icon: <Car size={20} /> },
    { label: t("status.inMaintenance"), value: stats.maintenance, color: "var(--warning)", icon: <Car size={20} /> },
  ];

  const columns = [
    {
      key: "vehicle",
      label: t("bookings.vehicle"),
      render: (v: VehicleRow) => (
        <div className={styles.vehicleCell}>
          <div className={styles.vehicleIcon} style={{ background: `${getStatusBg(v.status)}` }}>
            <Car size={18} style={{ color: getStatusColor(v.status) }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className={styles.vehicleName}>{v.brand} {v.model}</div>
            <div className={styles.vehicleSub}>{v.year} · {v.color}</div>
            {v.maintenance && v.maintenance[0]?.mileageAtService && v.mileage >= v.maintenance[0].mileageAtService + 10000 && (
              <span style={{ fontSize: "0.75rem", color: "var(--error)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                ⚠️ {t("maintenance.oilChangeRequired")}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "plateNumber",
      label: t("vehicles.plate"),
      render: (v: VehicleRow) => <span className={styles.plate}>{v.plateNumber}</span>,
    },
    {
      key: "transmission",
      label: t("vehicles.type"),
      render: (v: VehicleRow) => (
        <span className={styles.meta}>{v.transmission} · {v.fuelType}</span>
      ),
    },
    {
      key: "mileage",
      label: t("vehicles.mileage"),
      render: (v: VehicleRow) => <span className={styles.meta}>{formatMileage(v.mileage)}</span>,
    },
    {
      key: "dailyRate",
      label: t("vehicles.dailyRate"),
      render: (v: VehicleRow) => (
        <span className={styles.rate}>{formatCurrency(v.dailyRate)}</span>
      ),
    },
    {
      key: "status",
      label: t("label.status"),
      render: (v: VehicleRow) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <Badge
            color={getStatusColor(v.status)}
            bg={getStatusBg(v.status)}
            dot
          >
            {formatStatusT(v.status)}
          </Badge>
          {v.status === "RENTED" && v.bookings && v.bookings.length > 0 && (
            <Link
              href={`/bookings/${v.bookings[0].id}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: "0.75rem",
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {t("vehicles.viewBooking")} ↗
            </Link>
          )}
        </div>
      ),
    },
    {
      key: "bookings",
      label: t("nav.bookings"),
      align: "center" as const,
      render: (v: VehicleRow) => <span className={styles.meta}>{v._count.bookings}</span>,
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Stats */}
      <div className="stats-grid">
        {statCards.map((s) => (
          <Card key={s.label} padding="md">
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ color: s.color }}>
                {s.icon}
              </div>
              <div>
                <div className={styles.statValue} style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="page-header">
        <h1>
          <Car size={24} />
          {t("vehicles.title")}
        </h1>
        <div className="page-header-actions">
          <Link href="/vehicles/new">
            <Button icon={<Plus size={16} />}>{t("vehicles.addVehicle")}</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder={t("vehicles.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            id="vehicle-search"
          />
        </div>

        <div className={styles.filters}>
          {statusFilters.map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${statusFilter === s ? styles.filterActive : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "ALL" ? t("label.all") : formatStatusT(s)}
            </button>
          ))}
        </div>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === "grid" ? styles.viewActive : ""}`}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewActive : ""}`}
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "grid" ? (
        <div className={styles.grid}>
          {filtered.map((v) => (
            <Card
              key={v.id}
              hover
              onClick={() => router.push(`/vehicles/${v.id}`)}
              padding="none"
            >
              <div className={styles.cardTop}>
                <div className={styles.cardIcon} style={{ background: getStatusBg(v.status) }}>
                  <Car size={28} style={{ color: getStatusColor(v.status) }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                  <Badge color={getStatusColor(v.status)} bg={getStatusBg(v.status)} dot>
                    {formatStatusT(v.status)}
                  </Badge>
                  {v.status === "RENTED" && v.bookings && v.bookings.length > 0 && (
                    <Link
                      href={`/bookings/${v.bookings[0].id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--accent)",
                        textDecoration: "none",
                        fontWeight: 500,
                        backgroundColor: "var(--accent-muted)",
                        padding: "2px 8px",
                        borderRadius: "12px",
                      }}
                    >
                      {t("vehicles.viewBooking")} ↗
                    </Link>
                  )}
                </div>
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>
                  {v.brand} {v.model}
                </h3>
                <p className={styles.cardPlate}>{v.plateNumber}</p>
                <div className={styles.cardMeta}>
                  <span><Fuel size={14} /> {v.fuelType}</span>
                  <span><Gauge size={14} /> {formatMileage(v.mileage)}</span>
                </div>
                {v.maintenance && v.maintenance[0]?.mileageAtService && v.mileage >= v.maintenance[0].mileageAtService + 10000 && (
                  <div style={{ padding: "4px 8px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px", color: "var(--error)", fontSize: "0.75rem", fontWeight: 600, marginTop: "8px", display: "inline-block" }}>
                    ⚠️ {t("maintenance.oilChangeRequired")} ({t("maintenance.lastOilChange")} {v.maintenance[0].mileageAtService} km)
                  </div>
                )}
                <div className={styles.cardFooter}>
                  <span className={styles.cardRate}>{formatCurrency(v.dailyRate)}</span>
                  <span className={styles.cardRateLabel}>{t("vehicles.perDay")}</span>
                </div>
              </div>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className={`empty-state ${styles.emptyFull}`}>
              <Car size={48} />
              <h3>{t("vehicles.noVehiclesFound")}</h3>
              <p>{t("vehicles.tryAdjusting")}</p>
            </div>
          )}
        </div>
      ) : (
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(v) => v.id}
          onRowClick={(v) => router.push(`/vehicles/${v.id}`)}
          emptyMessage={t("vehicles.noVehicles")}
        />
      )}
    </div>
  );
}
