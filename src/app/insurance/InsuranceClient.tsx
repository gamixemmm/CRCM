"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, CheckCircle2, Shield, XCircle, Clock3, AlertTriangle, Search, Filter } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/SettingsContext";
import { formatDate } from "@/lib/utils";
import { recordInsurancePayment } from "@/actions/insurance";
import styles from "./insurance.module.css";

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
    { value: "all", label: t("label.all") },
    { value: "overdue", label: t("insurance.overdue") },
    { value: "dueSoon", label: t("insurance.dueSoon") },
    { value: "ok", label: t("insurance.covered") },
    { value: "missing", label: t("insurance.missing") },
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
      toast(t("insurance.chooseEndDate"), "error");
      return;
    }

    const parsedAmount = amount.trim() ? Number(amount) : 0;
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      toast(t("expenses.invalidAmount"), "error");
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
      return <Badge variant="warning" icon={<AlertTriangle size={12} />}>{t("insurance.noDate")}</Badge>;
    }
    if (vehicle.status === "overdue") {
      return <Badge variant="danger" icon={<XCircle size={12} />}>{t("insurance.overdue")}</Badge>;
    }
    if (vehicle.status === "dueSoon") {
      return <Badge variant="warning" icon={<Clock3 size={12} />}>{t("insurance.endsIn")} {vehicle.daysUntilEnd} {t("label.days")}</Badge>;
    }
    return <Badge variant="success" icon={<CheckCircle2 size={12} />}>{t("insurance.covered")}</Badge>;
  };

  const columns = [
    {
      key: "vehicle",
      label: t("expenses.vehicle"),
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
      label: t("insurance.lastPaid"),
      render: (v: EnrichedVehicle) => v.lastPaidDate ? formatDate(v.lastPaidDate) : "-",
    },
    {
      key: "endDate",
      label: t("insurance.ends"),
      render: (v: EnrichedVehicle) => v.insuranceEndDate ? formatDate(v.insuranceEndDate) : "-",
    },
    {
      key: "latestAmount",
      label: t("insurance.lastAmount"),
      render: (v: EnrichedVehicle) => v.insurancePayments[0] ? formatPrice(v.insurancePayments[0].amount) : "-",
    },
    {
      key: "status",
      label: t("label.status"),
      render: renderStatus,
    },
    {
      key: "actions",
      label: t("label.actions"),
      align: "right" as const,
      render: (v: EnrichedVehicle) => (
        <Button size="sm" variant="secondary" icon={<Shield size={14} />} onClick={() => openPaymentModal(v)}>
          {t("invoices.recordPayment")}
        </Button>
      ),
    },
  ];

  const mobileCards = filteredVehicles.map((v) => (
    <Card
      key={v.id}
      hover
      padding="md"
      className={styles.mobileCard}
      onClick={() => openPaymentModal(v)}
    >
      <div className={styles.mobileCardTop}>
        <div className={styles.mobileVehicle}>
          <div className={styles.mobileVehicleName}>{v.brand} {v.model}</div>
          <div className={styles.mobileVehiclePlate}>{v.plateNumber}</div>
        </div>
        {renderStatus(v)}
      </div>
      <div className={styles.mobileMetaGrid}>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("insurance.lastPaid")}</span>
          <span className={styles.mobileMetaValue}>{v.lastPaidDate ? formatDate(v.lastPaidDate) : "-"}</span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("insurance.ends")}</span>
          <span className={styles.mobileMetaValue}>{v.insuranceEndDate ? formatDate(v.insuranceEndDate) : "-"}</span>
        </div>
      </div>
      <div className={styles.mobileFooter} onClick={(e) => e.stopPropagation()}>
        <div style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
          {v.insurancePayments[0] ? formatPrice(v.insurancePayments[0].amount) : "-"}
        </div>
        <div className={styles.mobileActions}>
          <Button size="sm" variant="secondary" icon={<Shield size={14} />} onClick={() => openPaymentModal(v)}>
            {t("invoices.recordPayment")}
          </Button>
        </div>
      </div>
    </Card>
  ));

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className={`page-header ${styles.pageHeader}`}>
        <h1>
          <Shield size={24} />
          {t("nav.insurance")}
        </h1>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{t("dashboard.totalVehicles")}</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{stats.total}</div>
        </div>
        <div className={styles.statCard}>
          <div style={{ color: "var(--danger)", fontSize: "0.875rem" }}>{t("insurance.overdue")}</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--danger)" }}>{stats.overdue}</div>
        </div>
        <div className={styles.statCard}>
          <div style={{ color: "var(--warning)", fontSize: "0.875rem" }}>{t("insurance.dueWithin15")}</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--warning)" }}>{stats.dueSoon}</div>
        </div>
        <div className={styles.statCard}>
          <div style={{ color: "var(--success)", fontSize: "0.875rem" }}>{t("insurance.covered")}</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--success)" }}>{stats.ok}</div>
        </div>
      </div>

      <div className={styles.mobileStatsPanel}>
        <div className={styles.mobileStatsHeader}>
          <div>
            <div style={{ color: "var(--text-tertiary)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
              {t("dashboard.totalVehicles")}
            </div>
            <div className={styles.mobileStatsValue}>{stats.total}</div>
          </div>
          <Badge variant="default">{t("nav.insurance")}</Badge>
        </div>
        <div className={styles.mobileStatsList}>
          <div className={styles.mobileStatsItem}>
            <div className={styles.mobileStatsLabel}>
              <span className={styles.mobileStatsDot} style={{ background: "var(--danger)" }} />
              {t("insurance.overdue")}
            </div>
            <div className={styles.mobileStatsNumber} style={{ color: "var(--danger)" }}>{stats.overdue}</div>
          </div>
          <div className={styles.mobileStatsItem}>
            <div className={styles.mobileStatsLabel}>
              <span className={styles.mobileStatsDot} style={{ background: "var(--warning)" }} />
              {t("insurance.dueWithin15")}
            </div>
            <div className={styles.mobileStatsNumber} style={{ color: "var(--warning)" }}>{stats.dueSoon}</div>
          </div>
          <div className={styles.mobileStatsItem}>
            <div className={styles.mobileStatsLabel}>
              <span className={styles.mobileStatsDot} style={{ background: "var(--success)" }} />
              {t("insurance.covered")}
            </div>
            <div className={styles.mobileStatsNumber} style={{ color: "var(--success)" }}>{stats.ok}</div>
          </div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("insurance.searchPlaceholder")}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.statusRow}>
          <Filter size={14} style={{ color: "var(--text-tertiary)" }} />
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`${styles.statusButton} ${statusFilter === option.value ? styles.statusButtonActive : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.desktopTable}>
        <Table
          columns={columns}
          data={filteredVehicles}
          keyExtractor={(v) => v.id}
          emptyMessage={t("vehicles.noVehicles")}
        />
      </div>

      <div className={styles.mobileList}>
        {mobileCards}
        {filteredVehicles.length === 0 && (
          <div className={`empty-state ${styles.mobileEmpty}`}>
            <Shield size={44} />
            <h3>{t("vehicles.noVehicles")}</h3>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        title={t("insurance.recordPayment")}
        size="sm"
      >
        <div className={styles.modalForm}>
          <p>
            {t("insurance.setPeriodFor")}{" "}
            <strong>{selectedVehicle?.brand} {selectedVehicle?.model}</strong>.
          </p>

          <div className={styles.modalButtons}>
            {[
              { value: "6m", label: t("insurance.sixMonths") },
              { value: "1y", label: t("insurance.oneYear") },
              { value: "custom", label: t("insurance.custom") },
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
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>{t("insurance.customEndDate")}</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className={styles.modalInput}
              />
            </div>
          )}

          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t("insurance.amountSpentOptional")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("insurance.noExpensePlaceholder")}
              className={styles.modalInput}
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t("insurance.notesOptional")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.modalTextarea}
            />
          </div>

          <div className={styles.modalFooter}>
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
