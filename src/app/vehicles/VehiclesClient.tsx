"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { formatCurrency, formatStatus, getStatusColor, getStatusBg, formatMileage } from "@/lib/utils";
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
};

interface VehiclesClientProps {
  vehicles: VehicleRow[];
  stats: { total: number; available: number; rented: number; maintenance: number };
}

export default function VehiclesClient({ vehicles, stats }: VehiclesClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
    { label: "Total Fleet", value: stats.total, color: "var(--text-primary)", icon: <Car size={20} /> },
    { label: "Available", value: stats.available, color: "var(--success)", icon: <Car size={20} /> },
    { label: "Rented", value: stats.rented, color: "var(--accent)", icon: <Car size={20} /> },
    { label: "In Maintenance", value: stats.maintenance, color: "var(--warning)", icon: <Car size={20} /> },
  ];

  const columns = [
    {
      key: "vehicle",
      label: "Vehicle",
      render: (v: VehicleRow) => (
        <div className={styles.vehicleCell}>
          <div className={styles.vehicleIcon} style={{ background: `${getStatusBg(v.status)}` }}>
            <Car size={18} style={{ color: getStatusColor(v.status) }} />
          </div>
          <div>
            <div className={styles.vehicleName}>{v.brand} {v.model}</div>
            <div className={styles.vehicleSub}>{v.year} · {v.color}</div>
          </div>
        </div>
      ),
    },
    {
      key: "plateNumber",
      label: "Plate",
      render: (v: VehicleRow) => <span className={styles.plate}>{v.plateNumber}</span>,
    },
    {
      key: "transmission",
      label: "Type",
      render: (v: VehicleRow) => (
        <span className={styles.meta}>{v.transmission} · {v.fuelType}</span>
      ),
    },
    {
      key: "mileage",
      label: "Mileage",
      render: (v: VehicleRow) => <span className={styles.meta}>{formatMileage(v.mileage)}</span>,
    },
    {
      key: "dailyRate",
      label: "Daily Rate",
      render: (v: VehicleRow) => (
        <span className={styles.rate}>{formatCurrency(v.dailyRate)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: VehicleRow) => (
        <Badge
          color={getStatusColor(v.status)}
          bg={getStatusBg(v.status)}
          dot
        >
          {formatStatus(v.status)}
        </Badge>
      ),
    },
    {
      key: "bookings",
      label: "Bookings",
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
          Fleet Management
        </h1>
        <div className="page-header-actions">
          <Link href="/vehicles/new">
            <Button icon={<Plus size={16} />}>Add Vehicle</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search vehicles..."
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
              {s === "ALL" ? "All" : formatStatus(s)}
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
                <Badge color={getStatusColor(v.status)} bg={getStatusBg(v.status)} dot>
                  {formatStatus(v.status)}
                </Badge>
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
                <div className={styles.cardFooter}>
                  <span className={styles.cardRate}>{formatCurrency(v.dailyRate)}</span>
                  <span className={styles.cardRateLabel}>/ day</span>
                </div>
              </div>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className={`empty-state ${styles.emptyFull}`}>
              <Car size={48} />
              <h3>No vehicles found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      ) : (
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(v) => v.id}
          onRowClick={(v) => router.push(`/vehicles/${v.id}`)}
          emptyMessage="No vehicles found"
        />
      )}
    </div>
  );
}
