"use client";

import { useMemo, useState } from "react";
import { Car, CheckCircle2, ClipboardCheck, XCircle, Clock3, AlertTriangle, Search, Filter } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { completeTechnicalInspection } from "@/actions/technicalInspections";

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
    { value: "all", label: "All" },
    { value: "overdue", label: "Overdue" },
    { value: "dueSoon", label: "Due Soon" },
    { value: "ok", label: "Up to Date" },
    { value: "missing", label: "Missing" },
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
      toast("Please choose a next checkup date", "error");
      return;
    }
    const parsedCost = cost.trim() ? Number(cost) : 0;
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      toast("Please enter a valid amount", "error");
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
      return <Badge variant="warning" icon={<AlertTriangle size={12} />}>No registration date</Badge>;
    }
    if (vehicle.status === "overdue") {
      return <Badge variant="danger" icon={<XCircle size={12} />}>Overdue</Badge>;
    }
    if (vehicle.status === "dueSoon") {
      return <Badge variant="warning" icon={<Clock3 size={12} />}>Due in {vehicle.daysUntilDue} days</Badge>;
    }
    return <Badge variant="success" icon={<CheckCircle2 size={12} />}>Up to date</Badge>;
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
      key: "registration",
      label: "Registration Date",
      render: (v: EnrichedVehicle) => v.circulationDate ? formatDate(v.circulationDate) : "-",
    },
    {
      key: "lastInspection",
      label: "Last Checkup",
      render: (v: EnrichedVehicle) => v.lastInspectionDate ? formatDate(v.lastInspectionDate) : "-",
    },
    {
      key: "nextDue",
      label: "Next Checkup",
      render: (v: EnrichedVehicle) => v.nextDueDate ? formatDate(v.nextDueDate) : "-",
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
        <Button size="sm" variant="secondary" icon={<CheckCircle2 size={14} />} onClick={() => openCompleteModal(v)}>
          Checkup Done
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>
          <ClipboardCheck size={24} />
          La Visite Technique
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
          <div style={{ color: "var(--warning)", fontSize: "0.875rem" }}>Due Within 10 Days</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--warning)" }}>{stats.dueSoon}</div>
        </div>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
          <div style={{ color: "var(--success)", fontSize: "0.875rem" }}>Up to Date</div>
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
        title="Checkup Done"
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p>
            Choose the next technical inspection date for{" "}
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
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>Custom next checkup date</label>
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
              value={cost}
              onChange={(e) => setCost(e.target.value)}
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
              Cancel
            </Button>
            <Button type="button" loading={loading} onClick={handleComplete}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
