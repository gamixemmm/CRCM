"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import BookingCalendar from "@/components/ui/BookingCalendar";
import { useToast } from "@/components/ui/Toast";
import { logMaintenance } from "@/actions/maintenance";
import { useSettings } from "@/lib/SettingsContext";

export default function MaintenanceForm({ vehicles }: { vehicles: any[] }) {
  const router = useRouter();
  const { currency, t } = useSettings();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    vehicleId: "",
    serviceDate: new Date().toISOString().split("T")[0],
    description: "",
    cost: 0,
    serviceProvider: "",
    notes: "",
    type: "Autre",
    partsUsed: [] as string[],
  });

  const MAINTENANCE_TYPES = [
    "Vidange",
    "Changement des pneus",
    "Plaquettes de frein (avant / arrière)",
    "Disques de frein",
    "Freinage",
    "Équilibrage",
    "Parallélisme",
    "Réparation après accident",
    "Autre"
  ];

  const PARTS = [
    "Filtre à huile",
    "Filtre diesel",
    "Filtre à air",
    "Filtre habitacle",
    "Autres filtres"
  ];

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId || !form.serviceDate || !form.description) {
      toast(t("maintenance.fillRequired"), "error");
      return;
    }

    setLoading(true);

    const payload = {
      ...form,
      mileageAtService: selectedVehicle?.mileage || undefined,
    };

    const result = await logMaintenance(payload);
    setLoading(false);

    if (result.success) {
      toast(t("maintenance.successMsg"), "success");
      router.push("/maintenance");
    } else {
      toast(result.message, "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>{t("maintenance.logTask")}</h1>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
          {t("action.back")}
        </Button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "24px", flexDirection: "column", maxWidth: "800px" }}>
        
        <Card padding="lg">
          <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>{t("maintenance.selectVehicle")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Select
              label={t("maintenance.vehicleReg")}
              required
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              options={vehicles.map((v) => ({ 
                value: v.id, 
                label: `[${v.status}] ${v.plateNumber} ${v.brand} ${v.model}` 
              }))}
              placeholder={t("maintenance.vehiclePlaceholder")}
            />
            
            {selectedVehicle ? (
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>{t("maintenance.serviceDate")}</label>
                <BookingCalendar
                  bookedRanges={selectedVehicle.bookings || []}
                  startDate={form.serviceDate}
                  endDate={form.serviceDate}
                  mode="single"
                  onDateChange={(start) => {
                    if (start) setForm({ ...form, serviceDate: start });
                  }}
                />
              </div>
            ) : (
              <Input
                label={t("maintenance.serviceDate")}
                type="date"
                required
                value={form.serviceDate}
                onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
              />
            )}
          </div>
        </Card>

        <Card padding="lg">
          <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>{t("maintenance.diagnosis")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Select
                label={t("maintenance.interventionType")}
                required
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                options={MAINTENANCE_TYPES.map(t => ({ value: t, label: t }))}
              />
              <Input
                label={t("maintenance.serviceDescLabel")}
                required
                placeholder={t("maintenance.serviceDescPlaceholder")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Input
                label={`${t("maintenance.repairCostLabel")} (${currency})`}
                type="number"
                min={0}
                required
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
              />
              <Input
                label={t("maintenance.shopName")}
                value={form.serviceProvider}
                onChange={(e) => setForm({ ...form, serviceProvider: e.target.value })}
              />
            </div>

            {selectedVehicle && (
              <div style={{ padding: "10px 14px", background: "var(--bg-tertiary)", borderRadius: "8px", fontSize: "0.875rem", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>{t("maintenance.currentMileage")}</span>
                <span style={{ fontWeight: 700 }}>{selectedVehicle.mileage?.toLocaleString() || 0} km</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                {t("maintenance.partsUsed")}
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", background: "var(--bg-primary)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                {PARTS.map((part) => (
                  <label key={part} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
                    <input
                      type="checkbox"
                      checked={form.partsUsed.includes(part)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ ...form, partsUsed: [...form.partsUsed, part] });
                        } else {
                          setForm({ ...form, partsUsed: form.partsUsed.filter(p => p !== part) });
                        }
                      }}
                    />
                    {part}
                  </label>
                ))}
              </div>
            </div>

            <Textarea 
              label={t("maintenance.secondaryNotes")}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={t("maintenance.notesPlaceholder")}
              rows={3} 
            />
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
          <Button variant="secondary" type="button" onClick={() => router.back()}>{t("action.cancel")}</Button>
          <Button type="submit" loading={loading} icon={<Save size={16} />}>{t("maintenance.schedule")}</Button>
        </div>
      </form>
    </div>
  );
}
