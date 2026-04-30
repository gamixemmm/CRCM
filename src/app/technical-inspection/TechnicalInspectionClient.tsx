"use client";

import { useMemo, useState } from "react";
import { Car, CheckCircle2, ClipboardCheck, XCircle, Clock3, AlertTriangle, Search, Filter } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/SettingsContext";
import { formatDate } from "@/lib/utils";
import { completeTechnicalInspection } from "@/actions/technicalInspections";
import styles from "./technical-inspection.module.css";

type VehicleRow = {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  circulationDate: string | null;
  technicalInspectionDueDate: string | null;
  technicalInspections: {
    id: string;
    inspectionDate: string;
    nextDueDate: string;
    notes: string | null;
  }[];
};

type EnrichedVehicle = VehicleRow & {
  nextDueDate: string | null;
  lastInspectionDate: string | null;
  status: "missing" | "overdue" | "dueSoon" | "ok";
  daysUntilDue: number | null;
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

export default function TechnicalInspectionClient({ vehicles }: { vehicles: VehicleRow[] }) {
  const { toast } = useToast();
  const { t } = useSettings();
  const [selectedVehicle, setSelectedVehicle] = useState<EnrichedVehicle | null>(null);
  const [interval, setInterval] = useState<"6m" | "1y" | "custom">("1y");
  const [customDate, setCustomDate] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "dueSoon" | "ok" | "missing">("all");

  const today = startOfToday();

  const vehicleStatus = useMemo<EnrichedVehicle[]>(() => {
    return vehicles.map((vehicle) => {
      const latest = vehicle.technicalInspections[0];
      const nextDue = latest?.nextDueDate
        ? new Date(latest.nextDueDate)
        : vehicle.technicalInspectionDueDate
          ? new Date(vehicle.technicalInspectionDueDate)
        : vehicle.circulationDate
          ? addYears(new Date(vehicle.circulationDate), 1)
          : null;

      if (!nextDue) {
        return {
          ...vehicle,
          nextDueDate: null,
          lastInspectionDate: latest?.inspectionDate || null,
          status: "missing",
          daysUntilDue: null,
        };
      }

      nextDue.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const status = daysUntilDue < 0 ? "overdue" : daysUntilDue <= 10 ? "dueSoon" : "ok";

      return {
        ...vehicle,
        nextDueDate: nextDue.toISOString(),
        lastInspectionDate: latest?.inspectionDate || null,
        status,
        daysUntilDue,
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
    { value: "overdue", label: t("technicalInspection.overdue") },
    { value: "dueSoon", label: t("technicalInspection.dueSoon") },
    { value: "ok", label: t("technicalInspection.upToDate") },
    { value: "missing", label: t("technicalInspection.missing") },
  ] as const;

  const openCompleteModal = (vehicle: EnrichedVehicle) => {
    setSelectedVehicle(vehicle);
    setInterval("1y");
    setCustomDate("");
    setCost("");
    setNotes("");
  };

  const getNextDueDate = () => {
    if (interval === "custom") return customDate;
    const base = new Date();
    return toDateInputValue(interval === "6m" ? addMonths(base, 6) : addYears(base, 1));
  };

  const handleComplete = async () => {
    if (!selectedVehicle) return;
    const nextDueDate = getNextDueDate();
    if (!nextDueDate) {
      toast(t("technicalInspection.chooseNextDate"), "error");
      return;
    }
    const parsedCost = cost.trim() ? Number(cost) : 0;
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      toast(t("expenses.invalidAmount"), "error");
      return;
    }

    setLoading(true);
    const res = await completeTechnicalInspection({
      vehicleId: selectedVehicle.id,
      nextDueDate,
      cost: parsedCost,
      notes,
    });
    setLoading(false);

    if (res.success) {
      toast(res.message, "success");
      window.dispatchEvent(new Event("technical-inspection:updated"));
      setSelectedVehicle(null);
    } else {
      toast(res.message, "error");
    }
  };

  const renderStatus = (vehicle: EnrichedVehicle) => {
    if (vehicle.status === "missing") {
      return <Badge variant="warning" icon={<AlertTriangle size={12} />}>{t("technicalInspection.noRegistrationDate")}</Badge>;
    }
    if (vehicle.status === "overdue") {
      return <Badge variant="danger" icon={<XCircle size={12} />}>{t("technicalInspection.overdue")}</Badge>;
    }
    if (vehicle.status === "dueSoon") {
      return <Badge variant="warning" icon={<Clock3 size={12} />}>{t("technicalInspection.dueIn")} {vehicle.daysUntilDue} {t("label.days")}</Badge>;
    }
    return <Badge variant="success" icon={<CheckCircle2 size={12} />}>{t("technicalInspection.upToDate")}</Badge>;
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
      key: "registration",
      label: t("technicalInspection.registrationDate"),
      render: (v: EnrichedVehicle) => v.circulationDate ? formatDate(v.circulationDate) : "-",
    },
    {
      key: "lastInspection",
      label: t("technicalInspection.lastCheckup"),
      render: (v: EnrichedVehicle) => v.lastInspectionDate ? formatDate(v.lastInspectionDate) : "-",
    },
    {
      key: "nextDue",
      label: t("technicalInspection.nextCheckup"),
      render: (v: EnrichedVehicle) => v.nextDueDate ? formatDate(v.nextDueDate) : "-",
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
        <Button size="sm" variant="secondary" icon={<CheckCircle2 size={14} />} onClick={() => openCompleteModal(v)}>
          {t("technicalInspection.checkupDone")}
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
      onClick={() => openCompleteModal(v)}
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
          <span className={styles.mobileMetaLabel}>{t("technicalInspection.nextCheckup")}</span>
          <span className={styles.mobileMetaValue}>{v.nextDueDate ? formatDate(v.nextDueDate) : "-"}</span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("technicalInspection.lastCheckup")}</span>
          <span className={styles.mobileMetaValue}>{v.lastInspectionDate ? formatDate(v.lastInspectionDate) : "-"}</span>
        </div>
      </div>
      <div className={styles.mobileFooter} onClick={(e) => e.stopPropagation()}>
        <div style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
          {v.circulationDate ? `${t("technicalInspection.registrationDate")}: ${formatDate(v.circulationDate)}` : "-"}
        </div>
        <div className={styles.mobileActions}>
          <Button size="sm" variant="secondary" icon={<CheckCircle2 size={14} />} onClick={() => openCompleteModal(v)}>
            {t("technicalInspection.checkupDone")}
          </Button>
        </div>
      </div>
    </Card>
  ));

  return (
    <div className="animate-fade-in">
      <div className={`page-header ${styles.pageHeader}`}>
        <h1>
          <ClipboardCheck size={24} />
          {t("nav.technicalInspection")}
        </h1>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{t("dashboard.totalVehicles")}</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{stats.total}</div>
        </div>
        <div className={styles.statCard}>
          <div style={{ color: "var(--danger)", fontSize: "0.875rem" }}>{t("technicalInspection.overdue")}</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--danger)" }}>{stats.overdue}</div>
        </div>
        <div className={styles.statCard}>
          <div style={{ color: "var(--warning)", fontSize: "0.875rem" }}>{t("technicalInspection.dueWithin10")}</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--warning)" }}>{stats.dueSoon}</div>
        </div>
        <div className={styles.statCard}>
          <div style={{ color: "var(--success)", fontSize: "0.875rem" }}>{t("technicalInspection.upToDate")}</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--success)" }}>{stats.ok}</div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("technicalInspection.searchPlaceholder")}
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
        <Table columns={columns} data={filteredVehicles} keyExtractor={(v) => v.id} emptyMessage={t("vehicles.noVehicles")} />
      </div>

      <div className={styles.mobileList}>
        {mobileCards}
        {filteredVehicles.length === 0 && (
          <div className={`empty-state ${styles.mobileEmpty}`}>
            <ClipboardCheck size={44} />
            <h3>{t("vehicles.noVehicles")}</h3>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        title={t("technicalInspection.checkupDone")}
        size="sm"
      >
        <div className={styles.modalForm}>
          <p>
            {t("technicalInspection.chooseNextFor")}{" "}
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
                onClick={() => setInterval(option.value as "6m" | "1y" | "custom")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: `1px solid ${interval === option.value ? "var(--accent)" : "var(--border)"}`,
                  background: interval === option.value ? "var(--accent-muted)" : "var(--bg-secondary)",
                  color: interval === option.value ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {interval === "custom" && (
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>{t("technicalInspection.customNextDate")}</label>
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
              value={cost}
              onChange={(e) => setCost(e.target.value)}
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
            <Button type="button" loading={loading} onClick={handleComplete}>
              {t("action.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
