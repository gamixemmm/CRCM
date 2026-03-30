"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Search, User, Car, CheckCircle, XCircle, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDate, getFullName } from "@/lib/utils";
import { updatePaymentStatus, deleteInvoice } from "@/actions/invoices";

const statusFilters = ["ALL", "PENDING", "PAID"];

interface InvoicesClientProps {
  invoices: any[];
}

export default function InvoicesClient({ invoices }: InvoicesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [processing, setProcessing] = useState<string | null>(null);

  const filtered = invoices.filter((i) => {
    const matchesStatus = statusFilter === "ALL" || i.paymentStatus === statusFilter;
    const term = search.toLowerCase();
    const searchMatch =
      !search ||
      i.id.toLowerCase().includes(term) ||
      i.booking.customer.firstName.toLowerCase().includes(term) ||
      i.booking.customer.lastName.toLowerCase().includes(term);
    return matchesStatus && searchMatch;
  });

  const handleMarkPaid = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (confirm("Mark this invoice as PAID? This will also Complete the booking and return the vehicle.")) {
      setProcessing(id);
      const res = await updatePaymentStatus(id, "PAID", true);
      setProcessing(null);
      if (res.success) {
        toast("Invoice marked as PAID", "success");
      } else {
        toast(res.message, "error");
      }
    }
  };

  const handleMarkUnpaid = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Revert this invoice to PENDING?")) {
      setProcessing(id);
      const res = await updatePaymentStatus(id, "PENDING", false);
      setProcessing(null);
      if (res.success) {
        toast("Invoice reverted to PENDING", "success");
      } else {
        toast(res.message, "error");
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to permanently delete this invoice? This cannot be undone.")) {
      setProcessing(id);
      const res = await deleteInvoice(id);
      setProcessing(null);
      if (res.success) {
        toast("Invoice deleted", "success");
      } else {
        toast(res.message, "error");
      }
    }
  };

  const columns = [
    {
      key: "id",
      label: "Inv ID",
      render: (i: any) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          {i.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      key: "customer",
      label: "Customer & Vehicle",
      render: (i: any) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
            <User size={14} style={{ color: "var(--text-tertiary)" }} />
            <span>{getFullName(i.booking.customer.firstName, i.booking.customer.lastName)}</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Car size={14} style={{ color: "var(--text-tertiary)" }} />
            <span>{i.booking.vehicle.brand} {i.booking.vehicle.model}</span>
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date Created",
      render: (i: any) => <span>{formatDate(i.createdAt)}</span>,
    },
    {
      key: "amountDue",
      label: "Amount Due",
      render: (i: any) => (
        <span style={{ fontWeight: 700, color: i.paymentStatus === "PAID" ? "var(--success)" : "var(--accent)" }}>
          {formatCurrency(i.amountDue)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (i: any) => (
        <Badge
          variant={i.paymentStatus === "PAID" ? "success" : "warning"}
          size="sm"
        >
          {i.paymentStatus}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      render: (i: any) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          {i.paymentStatus !== "PAID" ? (
            <Button
              size="sm"
              variant="success"
              loading={processing === i.id}
              onClick={(e) => handleMarkPaid(i.id, e)}
              icon={<CheckCircle size={14} />}
            >
              Pay
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={processing === i.id}
              onClick={(e) => handleMarkUnpaid(i.id, e)}
              icon={<XCircle size={14} />}
            >
              Unpay
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            loading={processing === i.id}
            onClick={(e) => handleDelete(i.id, e)}
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
          <FileText size={24} />
          Invoices & Billing
        </h1>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "250px", maxWidth: "400px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search invoice ID or customer..."
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
              {s}
            </button>
          ))}
        </div>
      </div>

      <Table
        columns={columns}
        data={filtered}
        keyExtractor={(i) => i.id}
        onRowClick={(i) => router.push(`/invoices/${i.id}`)}
        emptyMessage="No invoices generated yet."
      />
    </div>
  );
}
