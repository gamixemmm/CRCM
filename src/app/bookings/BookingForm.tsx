"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
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
    pickupLocation: "",
    returnLocation: "",
    notes: "",
  });

  // Calculate pricing based on dates & selected vehicle
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const start = form.startDate ? new Date(form.startDate) : null;
  const end = form.endDate ? new Date(form.endDate) : null;
  
  let days = 0;
  if (start && end && end >= start) {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
  
  const estimatedTotal = days * (selectedVehicle?.dailyRate || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.vehicleId || !form.startDate || !form.endDate) {
      toast("Please fill all required fields", "warning");
      return;
    }

    setLoading(true);
    const result = await createBooking({
      ...form,
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
        <h1>New Booking</h1>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "24px", flexDirection: "column" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          
          <Card padding="lg">
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>Select Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Select
                label="Customer"
                required
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                options={customers.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName} (${c.licenseNumber})` }))}
                placeholder="Select a customer..."
              />
              <Select
                label="Vehicle"
                required
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                options={vehicles.map((v) => ({ value: v.id, label: `${v.brand} ${v.model} - [${v.plateNumber}] - $${v.dailyRate}/d` }))}
                placeholder="Select a vehicle..."
              />
              <div style={{ display: "flex", gap: "16px" }}>
                <Input
                  label="Start Date"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
                <Input
                  label="End Date"
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>Logistics & Pricing</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Input
                label="Pickup Location"
                value={form.pickupLocation}
                onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
              />
              <Input
                label="Return Location"
                value={form.returnLocation}
                onChange={(e) => setForm({ ...form, returnLocation: e.target.value })}
              />
              
              <div style={{ padding: "16px", background: "var(--bg-tertiary)", borderRadius: "8px", marginTop: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Duration:</span>
                  <span>{days} Days</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Daily Rate:</span>
                  <span>${selectedVehicle?.dailyRate || 0}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--border)", fontWeight: "bold" }}>
                  <span>Estimated Total:</span>
                  <span style={{ color: "var(--accent)" }}>${estimatedTotal.toFixed(2)}</span>
                </div>
              </div>

            </div>
          </Card>
        </div>

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
          <Button type="submit" loading={loading} icon={<Save size={16} />}>Confirm Booking</Button>
        </div>
      </form>
    </div>
  );
}
