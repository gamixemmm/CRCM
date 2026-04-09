"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { logMaintenance } from "@/actions/maintenance";
import { useSettings } from "@/lib/SettingsContext";

export default function MaintenanceForm({ vehicles }: { vehicles: any[] }) {
  const router = useRouter();
  const { currency } = useSettings();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    vehicleId: "",
    serviceDate: new Date().toISOString().split("T")[0],
    description: "",
    cost: 0,
    serviceProvider: "",
    notes: "",
  });

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const isSelectedVehicleRented = selectedVehicle?.status === "RENTED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId || !form.serviceDate || !form.description) {
      toast("Please fill out required fields", "error");
      return;
    }

    if (isSelectedVehicleRented) {
      toast("Action Blocked: This vehicle is currently actively rented.", "error");
      return;
    }

    setLoading(true);
    const result = await logMaintenance(form);
    setLoading(false);

    if (result.success) {
      toast("Maintenance physically logged & vehicle sidelined.", "success");
      router.push("/maintenance");
    } else {
      toast(result.message, "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Log Maintenance Task</h1>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "24px", flexDirection: "column", maxWidth: "800px" }}>
        
        <Card padding="lg">
          <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>Select Shop Vehicle</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Select
              label="Vehicle Registration"
              required
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              options={vehicles.map((v) => ({ 
                value: v.id, 
                label: `[${v.status}] ${v.plateNumber} ${v.brand} ${v.model}` 
              }))}
              placeholder="Assign a vehicle to the shop..."
            />
            
            {isSelectedVehicleRented && (
              <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", color: "var(--danger)", display: "flex", gap: "8px", alignItems: "center", fontSize: "0.875rem" }}>
                <AlertTriangle size={16} /> 
                Cannot log maintenance: The vehicle is actively out on a rental. Wait for the customer to return it.
              </div>
            )}
            
            <Input
              label="Service Date"
              type="date"
              required
              value={form.serviceDate}
              onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
            />
          </div>
        </Card>

        <Card padding="lg">
          <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>Diagnosis & Work Order</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Input
              label="Primary Service Description"
              required
              placeholder="ex: Oil change, new brake pads..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Input
                label={`Repair Cost (${currency})`}
                type="number"
                min={0}
                required
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
              />
              <Input
                label="Servicing Provider (Shop Name)"
                value={form.serviceProvider}
                onChange={(e) => setForm({ ...form, serviceProvider: e.target.value })}
              />
            </div>

            <Textarea 
              label="Secondary Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Mechanic feedback, damage assessments..."
              rows={3} 
            />
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
          <Button variant="secondary" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={loading} disabled={isSelectedVehicleRented} icon={<Save size={16} />}>Sidelined to Shop</Button>
        </div>
      </form>
    </div>
  );
}
