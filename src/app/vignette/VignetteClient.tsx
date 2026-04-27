"use client";

import { useState, useMemo } from "react";
import { ShieldCheck, Car, CheckCircle2, XCircle, Info, Plus } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import AddExpenseModal from "../expenses/AddExpenseModal";

interface VignetteClientProps {
  vehicles: any[];
  vignetteExpenses: any[];
  currentYear: number;
}

export default function VignetteClient({ vehicles, vignetteExpenses, currentYear }: VignetteClientProps) {
  const { t } = useSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

  const vehicleStatus = useMemo(() => {
    return vehicles.map(v => {
      const expense = vignetteExpenses.find(e => e.vehicleId === v.id);
      return {
        ...v,
        isPaid: !!expense,
        expenseId: expense?.id,
        paymentDate: expense?.date,
        amount: expense?.amount,
      };
    });
  }, [vehicles, vignetteExpenses]);

  const stats = useMemo(() => {
    const paid = vehicleStatus.filter(v => v.isPaid).length;
    return {
      total: vehicles.length,
      paid: paid,
      unpaid: vehicles.length - paid,
    };
  }, [vehicleStatus, vehicles.length]);

  const handleMarkPaid = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
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
        <span style={{ fontWeight: 500 }}>{v.amount} MAD</span>
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
          {t("vignette.title")} ({currentYear})
        </h1>
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

      <Table 
        columns={columns} 
        data={vehicleStatus} 
        keyExtractor={(v) => v.id}
        emptyMessage={t("expenses.noExpenses")}
      />

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVehicle(null);
        }}
        vehicles={vehicles}
        mode="vignette"
        initialVehicleId={selectedVehicle?.id}
      />
    </div>
  );
}
