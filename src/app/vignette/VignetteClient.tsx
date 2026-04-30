"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Car, CheckCircle2, XCircle, Info, Plus, Search, Filter } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";
import { useToast } from "@/components/ui/Toast";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { markVignettePaid } from "@/actions/vignette";

interface VignetteClientProps {
  vehicles: any[];
  vignetteExpenses: any[];
  vignettePayments: any[];
  currentYear: number;
}

export default function VignetteClient({ vehicles, vignetteExpenses, vignettePayments, currentYear }: VignetteClientProps) {
  const { t, formatPrice } = useSettings();
  const { toast } = useToast();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");

  const yearOptions = useMemo(() => {
    const years = new Set([currentYear, currentYear + 1]);
    vignetteExpenses.forEach((expense) => {
      years.add(new Date(expense.date).getFullYear());
    });
    vignettePayments.forEach((payment) => {
      years.add(payment.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear, vignetteExpenses, vignettePayments]);

  const selectedYearExpenses = useMemo(() => {
    return vignetteExpenses.filter((expense) => new Date(expense.date).getFullYear() === selectedYear);
  }, [vignetteExpenses, selectedYear]);

  const selectedYearPayments = useMemo(() => {
    return vignettePayments.filter((payment) => payment.year === selectedYear);
  }, [vignettePayments, selectedYear]);

  const vehicleStatus = useMemo(() => {
    return vehicles.map(v => {
      const payment = selectedYearPayments.find(p => p.vehicleId === v.id);
      const expense = selectedYearExpenses.find(e => e.vehicleId === v.id);
      const paidRecord = payment || expense;
      return {
        ...v,
        isPaid: !!paidRecord,
        expenseId: expense?.id,
        paymentDate: payment?.paidAt || expense?.date,
        amount: payment?.amount ?? expense?.amount ?? 0,
      };
    });
  }, [vehicles, selectedYearExpenses, selectedYearPayments]);

  const stats = useMemo(() => {
    const paid = vehicleStatus.filter(v => v.isPaid).length;
    return {
      total: vehicles.length,
      paid: paid,
      unpaid: vehicles.length - paid,
    };
  }, [vehicleStatus, vehicles.length]);

  const filteredVehicleStatus = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vehicleStatus.filter((vehicle) => {
      const matchesSearch = !term || `${vehicle.brand} ${vehicle.model} ${vehicle.plateNumber}`.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || (statusFilter === "paid" ? vehicle.isPaid : !vehicle.isPaid);
      return matchesSearch && matchesStatus;
    });
  }, [vehicleStatus, search, statusFilter]);

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "paid", label: t("vignette.paid") },
    { value: "unpaid", label: t("vignette.notPaid") },
  ] as const;

  const handleMarkPaid = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setAmount("");
    setNotes("");
    setIsModalOpen(true);
  };

  const handleSavePayment = async () => {
    if (!selectedVehicle) return;
    const parsedAmount = amount.trim() ? Number(amount) : 0;
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      toast("Please enter a valid amount", "error");
      return;
    }

    setSaving(true);
    const res = await markVignettePaid({
      vehicleId: selectedVehicle.id,
      year: selectedYear,
      amount: parsedAmount,
      notes,
    });
    setSaving(false);

    if (res.success) {
      toast(res.message, "success");
      setIsModalOpen(false);
      setSelectedVehicle(null);
      window.dispatchEvent(new Event("vignette:updated"));
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  const columns = [
    {
      key: "vehicle",
      label: t("expenses.vehicle"),
      render: (v: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ 
            width: "40px", 
            height: "40px", 
            background: "var(--bg-tertiary)", 
            borderRadius: "8px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            color: "var(--accent)"
          }}>
            <Car size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{v.brand} {v.model}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{v.plateNumber}</div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: t("expenses.vignetteStatus"),
      render: (v: any) => (
        v.isPaid ? (
          <Badge variant="success" icon={<CheckCircle2 size={12} />}>
            {t("vignette.paid")}
          </Badge>
        ) : (
          <Badge variant="danger" icon={<XCircle size={12} />}>
            {t("vignette.notPaid")}
          </Badge>
        )
      ),
    },
    {
      key: "paymentInfo",
      label: t("expenses.amount"),
      render: (v: any) => v.isPaid ? (
        <span style={{ fontWeight: 500 }}>{formatPrice(v.amount)}</span>
      ) : (
        <span style={{ color: "var(--text-tertiary)" }}>—</span>
      ),
    },
    {
      key: "actions",
      label: t("label.actions"),
      align: "right" as const,
      render: (v: any) => !v.isPaid && (
        <Button 
          size="sm" 
          variant="secondary" 
          icon={<Plus size={14} />}
          onClick={() => handleMarkPaid(v)}
        >
          {t("vignette.markAsPaid")}
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>
          <ShieldCheck size={24} />
          {t("vignette.title")} ({selectedYear})
        </h1>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        {yearOptions.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => setSelectedYear(year)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: `1px solid ${selectedYear === year ? "var(--accent)" : "var(--border)"}`,
              background: selectedYear === year ? "var(--accent-muted)" : "var(--bg-secondary)",
              color: selectedYear === year ? "var(--accent)" : "var(--text-secondary)",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {year}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "8px" }}>{t("vignette.totalVehicles")}</div>
          <div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>{stats.total}</div>
        </div>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "0.875rem", color: "var(--success)", marginBottom: "8px" }}>{t("vignette.paidCount")}</div>
          <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--success)" }}>{stats.paid}</div>
        </div>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "0.875rem", color: "var(--error)", marginBottom: "8px" }}>{t("vignette.unpaidCount")}</div>
          <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--error)" }}>{stats.unpaid}</div>
        </div>
      </div>

      <div style={{ 
        background: "rgba(59, 130, 246, 0.1)", 
        border: "1px solid rgba(59, 130, 246, 0.2)", 
        borderRadius: "12px", 
        padding: "16px", 
        marginBottom: "32px",
        display: "flex",
        gap: "16px",
        alignItems: "center"
      }}>
        <div style={{ color: "var(--accent)" }}><Info size={24} /></div>
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{t("vignette.reminder")}</div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t("vignette.reminderDesc")}</div>
        </div>
      </div>

      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle or plate"
            style={{ width: "100%", height: "40px", padding: "0 12px 0 38px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <Filter size={14} style={{ color: "var(--text-tertiary)" }} />
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: `1px solid ${statusFilter === option.value ? "var(--accent)" : "var(--border)"}`,
                background: statusFilter === option.value ? "var(--accent-muted)" : "var(--bg-primary)",
                color: statusFilter === option.value ? "var(--accent)" : "var(--text-secondary)",
                fontSize: "0.8125rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Table 
        columns={columns} 
        data={filteredVehicleStatus} 
        keyExtractor={(v) => v.id}
        emptyMessage={t("expenses.noExpenses")}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVehicle(null);
        }}
        title={t("expenses.addVignettePayment")}
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p>
            {selectedVehicle?.brand} {selectedVehicle?.model} - {selectedVehicle?.plateNumber} ({selectedYear})
          </p>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>{t("expenses.amount")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              style={{ width: "100%", height: "40px", padding: "0 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>{t("expenses.descriptionOptional")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", minHeight: "80px", padding: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>{t("action.cancel")}</Button>
            <Button type="button" loading={saving} onClick={handleSavePayment}>{t("action.save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
