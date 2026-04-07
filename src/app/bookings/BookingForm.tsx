"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Building2, User } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { createBooking } from "@/actions/bookings";

export default function BookingForm({ vehicles, customers }: { vehicles: any[]; customers: any[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    vehicleId: "",
    startDate: "",
    endDate: "",
    clientType: "PARTICULIER",
    companyName: "",
    companyICE: "",
    paymentMethod: "ESPECE",
    driverFirstName: "",
    driverLastName: "",
    driverCIN: "",
    pricePerDay: 0,
    pickupLocation: "",
    returnLocation: "",
    notes: "",
  });

  // Calculate pricing based on dates & selected vehicle
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const start = form.startDate ? new Date(form.startDate) : null;
  const end = form.endDate ? new Date(form.endDate) : null;
  
  // Auto-set price per day when vehicle changes
  const effectiveRate = form.pricePerDay > 0 ? form.pricePerDay : (selectedVehicle?.dailyRate || 0);

  let days = 0;
  if (start && end && end >= start) {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
  
  const estimatedTotal = days * effectiveRate;

  const handleVehicleChange = (vehicleId: string) => {
    const v = vehicles.find((veh) => veh.id === vehicleId);
    setForm({
      ...form,
      vehicleId,
      pricePerDay: v?.dailyRate || 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.vehicleId || !form.startDate || !form.endDate) {
      toast("Please fill all required fields", "error");
      return;
    }

    if (form.clientType === "ENTREPRISE" && (!form.companyName || !form.companyICE)) {
      toast("Company name and ICE are required for company rentals", "error");
      return;
    }

    if (form.clientType === "ENTREPRISE" && (!form.driverLastName || !form.driverFirstName || !form.driverCIN)) {
      toast("Driver information is required for company rentals", "error");
      return;
    }

    setLoading(true);
    const result = await createBooking({
      ...form,
      pricePerDay: effectiveRate,
      totalAmount: estimatedTotal,
    });

    setLoading(false);

    if (result.success) {
      toast(result.message, "success");
      router.push("/bookings");
    } else {
      toast(result.message, "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>New Rental</h1>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "24px", flexDirection: "column" }}>
        
        {/* Client Type Toggle */}
        <Card padding="lg">
          <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>Client Type</h3>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={() => setForm({ ...form, clientType: "PARTICULIER" })}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "16px 24px",
                borderRadius: "10px",
                cursor: "pointer",
                border: form.clientType === "PARTICULIER" 
                  ? "2px solid var(--accent)" 
                  : "2px solid var(--border)",
                background: form.clientType === "PARTICULIER" 
                  ? "var(--accent-muted)" 
                  : "var(--bg-secondary)",
                color: form.clientType === "PARTICULIER" 
                  ? "var(--accent)" 
                  : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "1rem",
                transition: "all 0.2s ease",
              }}
            >
              <User size={20} />
              Individual (Particulier)
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, clientType: "ENTREPRISE" })}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "16px 24px",
                borderRadius: "10px",
                cursor: "pointer",
                border: form.clientType === "ENTREPRISE" 
                  ? "2px solid var(--warning)" 
                  : "2px solid var(--border)",
                background: form.clientType === "ENTREPRISE" 
                  ? "var(--warning-muted)" 
                  : "var(--bg-secondary)",
                color: form.clientType === "ENTREPRISE" 
                  ? "var(--warning)" 
                  : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "1rem",
                transition: "all 0.2s ease",
              }}
            >
              <Building2 size={20} />
              Company (Entreprise)
            </button>
          </div>

          {/* Company Fields - show only for Entreprise */}
          {form.clientType === "ENTREPRISE" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "20px", padding: "16px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <Input
                label="Company Name"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="e.g. SARL Transport Express"
              />
              <Input
                label="ICE (Business ID)"
                required
                value={form.companyICE}
                onChange={(e) => setForm({ ...form, companyICE: e.target.value })}
                placeholder="e.g. 001234567000012"
              />
            </div>
          )}
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          
          {/* Left: Selections */}
          <Card padding="lg">
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>Rental Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Select
                label="Broker (Semsar)"
                required
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                options={customers.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}${c.phone ? ` (${c.phone})` : ""}` }))}
                placeholder="Select a broker..."
              />
              <Select
                label="Vehicle"
                required
                value={form.vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                options={vehicles.map((v) => ({ value: v.id, label: `${v.brand} ${v.model} — [${v.plateNumber}]` }))}
                placeholder="Select a vehicle..."
              />
              <div style={{ display: "flex", gap: "16px" }}>
                <Input
                  label="Delivery Date"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
                <Input
                  label="Return Date"
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
          </Card>

          {/* Right: Pricing & Payment */}
          <Card padding="lg">
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>Pricing & Payment</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Input
                label="Price Per Day"
                type="number"
                min={0}
                required
                value={form.pricePerDay}
                onChange={(e) => setForm({ ...form, pricePerDay: Number(e.target.value) })}
                hint="Auto-filled from vehicle, edit to override"
              />

              <Select
                label="Payment Method"
                required
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                options={[
                  { value: "ESPECE", label: "Cash (Espèce)" },
                  { value: "CHEQUE", label: "Check (Chèque)" },
                ]}
              />
              
              <div style={{ padding: "16px", background: "var(--bg-tertiary)", borderRadius: "8px", marginTop: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Duration:</span>
                  <span>{days} Days</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Price/Day:</span>
                  <span>${effectiveRate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--border)", fontWeight: "bold" }}>
                  <span>Total Payment:</span>
                  <span style={{ color: "var(--accent)", fontSize: "1.25rem" }}>${estimatedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Driver Info - only for Company rentals */}
        {form.clientType === "ENTREPRISE" && (
          <Card padding="lg">
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
              Driver Information
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 400, marginLeft: "8px" }}>
                Required for company rentals
              </span>
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <Input
                label="Driver Last Name"
                required
                value={form.driverLastName}
                onChange={(e) => setForm({ ...form, driverLastName: e.target.value })}
              />
              <Input
                label="Driver First Name"
                required
                value={form.driverFirstName}
                onChange={(e) => setForm({ ...form, driverFirstName: e.target.value })}
              />
              <Input
                label="CIN (ID Number)"
                required
                value={form.driverCIN}
                onChange={(e) => setForm({ ...form, driverCIN: e.target.value })}
                placeholder="e.g. AB123456"
              />
            </div>
          </Card>
        )}

        <Card padding="lg">
          <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>Additional Notes</h3>
          <Textarea 
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any special requests or details..."
            rows={3} 
          />
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
          <Button variant="secondary" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Save size={16} />}>Confirm Rental</Button>
        </div>
      </form>
    </div>
  );
}
