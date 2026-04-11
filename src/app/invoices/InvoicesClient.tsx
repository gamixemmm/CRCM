"use client";
import { useSettings } from "@/lib/SettingsContext";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileText, Search, User, Car, CheckCircle, XCircle, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { formatDate, getFullName } from "@/lib/utils";
import { updatePaymentStatus, deleteInvoice } from "@/actions/invoices";

const statusFilters = ["ALL", "UNPAID", "PENDING", "PARTIAL", "PAID"];

interface InvoicesClientProps {
  invoices: any[];
}

export default function InvoicesClient({ invoices }: InvoicesClientProps) {
  const { formatPrice: formatCurrency, t, formatStatusT } = useSettings();

  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "ALL");
  const [processing, setProcessing] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ id: "", amount: 0, amountDue: 0, method: "ESPECE" });

  const filtered = invoices.filter((i) => {
    const matchesStatus = 
      statusFilter === "ALL" || 
      i.paymentStatus === statusFilter || 
      (statusFilter === "UNPAID" && (i.paymentStatus === "PENDING" || i.paymentStatus === "PARTIAL"));
    const term = search.toLowerCase();
    const searchMatch =
      !search ||
      i.id.toLowerCase().includes(term) ||
      i.booking.customer.firstName.toLowerCase().includes(term) ||
      i.booking.customer.lastName.toLowerCase().includes(term);
    return matchesStatus && searchMatch;
  });

  const handleMarkPaid = (id: string, amountDue: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setPaymentForm({ id, amount: amountDue, amountDue, method: "ESPECE" });
    setPaymentModalOpen(true);
  };

  const submitPayment = async () => {
    if (paymentForm.amount <= 0) {
      toast("Invalid amount", "error");
      return;
    }
    
    const isFullPayment = paymentForm.amount >= paymentForm.amountDue;
    const finalStatus = isFullPayment ? "PAID" : "PARTIAL";

    setProcessing(paymentForm.id);
    setPaymentModalOpen(false);
    
    const res = await updatePaymentStatus(paymentForm.id, finalStatus, paymentForm.amount, false, paymentForm.method);
    setProcessing(null);
    if (res.success) {
      toast(res.message, "success");
    } else {
      toast(res.message, "error");
    }
  };

  const handleMarkUnpaid = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessing(id);
    const res = await updatePaymentStatus(id, "PENDING", 0, false);
    setProcessing(null);
    if (res.success) {
      toast("Invoice reverted to PENDING", "success");
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessing(id);
    const res = await deleteInvoice(id);
    setProcessing(null);
    if (res.success) {
      toast("Invoice deleted", "success");
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  const columns = [
    {
      key: "id",
      label: t("invoices.invId"),
      render: (i: any) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          {i.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      key: "customer",
      label: t("invoices.customerVehicle"),
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
      label: t("invoices.dateCreated"),
      render: (i: any) => <span>{formatDate(i.createdAt)}</span>,
    },
    {
      key: "amountDue",
      label: t("invoices.amountDue"),
      render: (i: any) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontWeight: 700, color: i.paymentStatus === "PAID" ? "var(--success)" : "var(--accent)" }}>
            {formatCurrency(i.amountDue)}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {t("label.total")}: {formatCurrency(i.totalAmount)}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: t("label.status"),
      render: (i: any) => (
        <Badge
          variant={i.paymentStatus === "PAID" ? "success" : i.paymentStatus === "PARTIAL" ? "info" : "warning"}
          size="sm"
        >
          {formatStatusT(i.paymentStatus)}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: t("label.actions"),
      align: "right" as const,
      render: (i: any) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          {i.paymentStatus !== "PAID" ? (
            <Button
              size="sm"
              variant="success"
              loading={processing === i.id}
              onClick={(e) => handleMarkPaid(i.id, i.amountDue, e)}
              icon={<CheckCircle size={14} />}
            >
              {t("invoices.pay")}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={processing === i.id}
              onClick={(e) => handleMarkUnpaid(i.id, e)}
              icon={<XCircle size={14} />}
            >
              {t("invoices.unpay")}
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
          {t("invoices.title")}
        </h1>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "250px", maxWidth: "400px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder={t("invoices.searchPlaceholder")}
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
        keyExtractor={(i) => i.id}
        onRowClick={(i) => router.push(`/invoices/${i.id}`)}
        emptyMessage={t("invoices.noInvoices")}
      />

      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={t("invoices.recordPayment")}
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "8px", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: "var(--text-secondary)" }}>{t("invoices.amountDue")}</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(paymentForm.amountDue)}</span>
            </div>
          </div>
          <Input 
            label={t("invoices.paymentAmount")} 
            type="number"
            min={0}
            step="0.01"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
          />
          <Select
            label={t("invoices.paymentMethod")}
            options={[
              { value: "ESPECE", label: t("payment.cash") },
              { value: "CARTE", label: t("payment.card") },
              { value: "VIREMENT", label: t("payment.transfer") },
              { value: "CHEQUE", label: t("payment.check") },
            ]}
            value={paymentForm.method}
            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
          />

          <div style={{ marginTop: "8px" }}>
            <Button fullWidth onClick={submitPayment} loading={processing === paymentForm.id}>
              {t("invoices.confirmPayment")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
