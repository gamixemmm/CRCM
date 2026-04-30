"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, CheckCircle2, Shield, XCircle, Clock3, AlertTriangle, Search, Filter } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/SettingsContext";
import { formatDate } from "@/lib/utils";
import { recordInsurancePayment } from "@/actions/insurance";

type VehicleRow = {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  insuranceExpiry: string | null;
  insurancePayments: {
    id: string;
    paidAt: string;
    endDate: string;
    amount: number;
    notes: string | null;
  }[];
};

type EnrichedVehicle = VehicleRow & {
  lastPaidDate: string | null;
  insuranceEndDate: string | null;
  status: "missing" | "overdue" | "dueSoon" | "ok";
  daysUntilEnd: number | null;
};

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function toDateInputValue(date: Date) {
  return date.toISOString().split("T")[0];
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export default function InsuranceClient({ vehicles }: { vehicles: VehicleRow[] }) {
  const { toast } = useToast();
  const { t, formatPrice } = useSettings();
  const router = useRouter();
  const [selectedVehicle, setSelectedVehicle] = useState<EnrichedVehicle | null>(null);
  const [period, setPeriod] = useState<"6m" | "1y" | "custom">("1y");
  const [customDate, setCustomDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "dueSoon" | "ok" | "missing">("all");

  const today = startOfToday();

  const vehicleStatus = useMemo<EnrichedVehicle[]>(() => {
    return vehicles.map((vehicle) => {
      const latest = vehicle.insurancePayments[0];
      const endDate = latest?.endDate
        ? new Date(latest.endDate)
        : vehicle.insuranceExpiry
          ? new Date(vehicle.insuranceExpiry)
          : null;

      if (!endDate) {
        return {
          ...vehicle,
          lastPaidDate: latest?.paidAt || null,
          insuranceEndDate: null,
          status: "missing",
          daysUntilEnd: null,
        };
      }

      endDate.setHours(0, 0, 0, 0);
      const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const status = daysUntilEnd < 0 ? "overdue" : daysUntilEnd <= 15 ? "dueSoon" : "ok";

      return {
        ...vehicle,
        lastPaidDate: latest?.paidAt || null,
        insuranceEndDate: endDate.toISOString(),
        status,
        daysUntilEnd,
      };
    });
  }, [vehicles, today]);

  const stats = useMemo(() => ({
    total: vehicleStatus.length,
    overdue: vehicleStatus.filter((v) => v.status === "overdue").length,
    dueSoon: vehicleStatus.filter((v) => v.status === "dueSoon").length,
    ok: vehicleStatus.filter((v) => v.status === "ok").length,
  }), [vehicleStatus]);

  const filteredVehicles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vehicleStatus.filter((vehicle) => {
      const matchesSearch = !term || `${vehicle.brand} ${vehicle.model} ${vehicle.plateNumber}`.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicleStatus, search, statusFilter]);

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "overdue", label: "Overdue" },
    { value: "dueSoon", label: "Due Soon" },
    { value: "ok", label: "Covered" },
    { value: "missing", label: "Missing" },
  ] as const;

  const openPaymentModal = (vehicle: EnrichedVehicle) => {
    setSelectedVehicle(vehicle);
    setPeriod("1y");
    setCustomDate("");
    setAmount("");
    setNotes("");
  };

  const getEndDate = () => {
    if (period === "custom") return customDate;
    const base = new Date();
    return toDateInputValue(period === "6m" ? addMonths(base, 6) : addYears(base, 1));
  };

  const handleSave = async () => {
    if (!selectedVehicle) return;
    const endDate = getEndDate();
    if (!endDate) {
      toast("Please choose an insurance end date", "error");
      return;
    }

    const parsedAmount = amount.trim() ? Number(amount) : 0;
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      toast("Please enter a valid amount", "error");
      return;
    }

    setLoading(true);
    const res = await recordInsurancePayment({
      vehicleId: selectedVehicle.id,
      endDate,
      amount: parsedAmount,
      notes,
    });
    setLoading(false);

    if (res.success) {
      toast(res.message, "success");
      window.dispatchEvent(new Event("insurance:updated"));
      setSelectedVehicle(null);
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  const renderStatus = (vehicle: EnrichedVehicle) => {
    if (vehicle.status === "missing") {
      return <Badge variant="warning" icon={<AlertTriangle size={12} />}>No insurance date</Badge>;
    }
    if (vehicle.status === "overdue") {
      return <Badge variant="danger" icon={<XCircle size={12} />}>Overdue</Badge>;
    }
    if (vehicle.status === "dueSoon") {
      return <Badge variant="warning" icon={<Clock3 size={12} />}>Ends in {vehicle.daysUntilEnd} days</Badge>;
    }
    return <Badge variant="success" icon={<CheckCircle2 size={12} />}>Covered</Badge>;
  };

  const columns = [
    {
      key: "vehicle",
      label: "Vehicle",
      render: (v: EnrichedVehicle) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", background: "var(--bg-tertiary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
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
      key: "lastPaid",
      label: "Last Paid",
      render: (v: EnrichedVehicle) => v.lastPaidDate ? formatDate(v.lastPaidDate) : "-",
    },
    {
      key: "endDate",
      label: "Insurance Ends",
      render: (v: EnrichedVehicle) => v.insuranceEndDate ? formatDate(v.insuranceEndDate) : "-",
    },
    {
      key: "latestAmount",
      label: "Last Amount",
      render: (v: EnrichedVehicle) => v.insurancePayments[0] ? formatPrice(v.insurancePayments[0].amount) : "-",
    },
    {
      key: "status",
      label: "Status",
      render: renderStatus,
    },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      render: (v: EnrichedVehicle) => (
        <Button size="sm" variant="secondary" icon={<Shield size={14} />} onClick={() => openPaymentModal(v)}>
          Record Payment
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>
          <Shield size={24} />
          Insurance
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Total Vehicles</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{stats.total}</div>
        </div>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
          <div style={{ color: "var(--danger)", fontSize: "0.875rem" }}>Overdue</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--danger)" }}>{stats.overdue}</div>
        </div>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
          <div style={{ color: "var(--warning)", fontSize: "0.875rem" }}>Due Within 15 Days</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--warning)" }}>{stats.dueSoon}</div>
        </div>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
          <div style={{ color: "var(--success)", fontSize: "0.875rem" }}>Covered</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--success)" }}>{stats.ok}</div>
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
        data={filteredVehicles}
        keyExtractor={(v) => v.id}
        emptyMessage="No vehicles found."
      />

      <Modal
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        title="Record Insurance Payment"
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p>
            Set the insurance period for{" "}
            <strong>{selectedVehicle?.brand} {selectedVehicle?.model}</strong>.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {[
              { value: "6m", label: "6 months" },
              { value: "1y", label: "1 year" },
              { value: "custom", label: "Custom" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value as "6m" | "1y" | "custom")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: `1px solid ${period === option.value ? "var(--accent)" : "var(--border)"}`,
                  background: period === option.value ? "var(--accent-muted)" : "var(--bg-secondary)",
                  color: period === option.value ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>Custom insurance end date</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{ width: "100%", height: "40px", padding: "0 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
              />
            </div>
          )}

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>Amount spent optional</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Leave empty if no expense"
              style={{ width: "100%", height: "40px", padding: "0 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>Notes optional</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", minHeight: "80px", padding: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <Button type="button" variant="ghost" onClick={() => setSelectedVehicle(null)}>
              {t("action.cancel")}
            </Button>
            <Button type="button" loading={loading} onClick={handleSave}>
              {t("action.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
