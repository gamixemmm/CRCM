"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Plus, Search, Car, User } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import { formatCurrency, formatDate, formatStatus, getStatusColor, getStatusBg, getFullName } from "@/lib/utils";

const statusFilters = ["ALL", "PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"];

interface BookingsClientProps {
  bookings: any[];
}

export default function BookingsClient({ bookings }: BookingsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = bookings.filter((b) => {
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    const term = search.toLowerCase();
    const matchesSearch =
      !search ||
      b.customer.firstName.toLowerCase().includes(term) ||
      b.customer.lastName.toLowerCase().includes(term) ||
      b.vehicle.plateNumber.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const columns = [
    {
      key: "vehicle",
      label: "Vehicle",
      render: (b: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ padding: "8px", background: "var(--bg-tertiary)", borderRadius: "6px" }}>
            <Car size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{b.vehicle.brand} {b.vehicle.model}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{b.vehicle.plateNumber}</div>
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (b: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <User size={14} style={{ color: "var(--text-tertiary)" }} />
          <span>{getFullName(b.customer.firstName, b.customer.lastName)}</span>
        </div>
      ),
    },
    {
      key: "dates",
      label: "Duration",
      render: (b: any) => (
        <div>
          <div style={{ fontSize: "0.8125rem" }}>{formatDate(b.startDate)}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>to {formatDate(b.endDate)}</div>
        </div>
      ),
    },
    {
      key: "totalAmount",
      label: "Amount",
      render: (b: any) => (
        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
          {formatCurrency(b.totalAmount)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (b: any) => (
        <Badge color={getStatusColor(b.status)} bg={getStatusBg(b.status)} dot>
          {formatStatus(b.status)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>
          <CalendarDays size={24} />
          Bookings
        </h1>
        <div className="page-header-actions">
          <Link href="/bookings/new">
            <Button icon={<Plus size={16} />}>New Booking</Button>
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "250px", maxWidth: "400px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search by customer or plate..."
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
              {s === "ALL" ? "All" : formatStatus(s)}
            </button>
          ))}
        </div>
      </div>

      <Table
        columns={columns}
        data={filtered}
        keyExtractor={(b) => b.id}
        onRowClick={(b) => router.push(`/bookings/${b.id}`)}
        emptyMessage="No bookings found"
      />
    </div>
  );
}
