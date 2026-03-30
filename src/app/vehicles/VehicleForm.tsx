"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createVehicle, updateVehicle } from "@/actions/vehicles";
import styles from "./form.module.css";

const transmissionOptions = [
  { value: "Automatic", label: "Automatic" },
  { value: "Manual", label: "Manual" },
];

const fuelOptions = [
  { value: "Gasoline", label: "Gasoline" },
  { value: "Diesel", label: "Diesel" },
  { value: "Electric", label: "Electric" },
  { value: "Hybrid", label: "Hybrid" },
];

const colorOptions = [
  { value: "Black", label: "Black" },
  { value: "White", label: "White" },
  { value: "Silver", label: "Silver" },
  { value: "Gray", label: "Gray" },
  { value: "Red", label: "Red" },
  { value: "Blue", label: "Blue" },
  { value: "Green", label: "Green" },
  { value: "Brown", label: "Brown" },
  { value: "Gold", label: "Gold" },
  { value: "Orange", label: "Orange" },
];

const statusOptions = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RENTED", label: "Rented" },
  { value: "MAINTENANCE", label: "In Maintenance" },
  { value: "OUT_OF_SERVICE", label: "Out of Service" },
];

interface VehicleFormProps {
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    plateNumber: string;
    color: string;
    transmission: string;
    fuelType: string;
    dailyRate: number;
    mileage: number;
    status: string;
    imageUrl: string | null;
    insuranceExpiry: Date | null;
    registrationExpiry: Date | null;
    notes: string | null;
  };
}

export default function VehicleForm({ vehicle }: VehicleFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!vehicle;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [form, setForm] = useState({
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    year: vehicle?.year || new Date().getFullYear(),
    plateNumber: vehicle?.plateNumber || "",
    color: vehicle?.color || "Black",
    transmission: vehicle?.transmission || "Automatic",
    fuelType: vehicle?.fuelType || "Gasoline",
    dailyRate: vehicle?.dailyRate || 0,
    mileage: vehicle?.mileage || 0,
    status: vehicle?.status || "AVAILABLE",
    imageUrl: vehicle?.imageUrl || "",
    insuranceExpiry: vehicle?.insuranceExpiry
      ? new Date(vehicle.insuranceExpiry).toISOString().split("T")[0]
      : "",
    registrationExpiry: vehicle?.registrationExpiry
      ? new Date(vehicle.registrationExpiry).toISOString().split("T")[0]
      : "",
    notes: vehicle?.notes || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "year" || name === "mileage" || name === "dailyRate"
        ? Number(value)
        : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const result = isEdit
        ? await updateVehicle(vehicle.id, form)
        : await createVehicle(form);

      if (result.success) {
        toast(result.message, "success");
        router.push("/vehicles");
        router.refresh();
      } else {
        toast(result.message, "error");
        if (result.errors) setErrors(result.errors);
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>{isEdit ? "Edit Vehicle" : "Add New Vehicle"}</h1>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          {/* Basic Info */}
          <Card padding="lg" className={styles.section}>
            <h3 className={styles.sectionTitle}>Vehicle Information</h3>
            <div className={styles.fieldGrid}>
              <Input
                label="Brand"
                name="brand"
                value={form.brand}
                onChange={handleChange}
                placeholder="e.g. Toyota"
                required
                error={errors.brand?.[0]}
              />
              <Input
                label="Model"
                name="model"
                value={form.model}
                onChange={handleChange}
                placeholder="e.g. Corolla"
                required
                error={errors.model?.[0]}
              />
              <Input
                label="Year"
                name="year"
                type="number"
                value={form.year}
                onChange={handleChange}
                min={2000}
                max={2030}
                required
              />
              <Input
                label="Plate Number"
                name="plateNumber"
                value={form.plateNumber}
                onChange={handleChange}
                placeholder="e.g. AB-123-CD"
                required
                error={errors.plateNumber?.[0]}
              />
              <Select
                label="Color"
                name="color"
                value={form.color}
                onChange={handleChange}
                options={colorOptions}
              />
              <Select
                label="Transmission"
                name="transmission"
                value={form.transmission}
                onChange={handleChange}
                options={transmissionOptions}
              />
              <Select
                label="Fuel Type"
                name="fuelType"
                value={form.fuelType}
                onChange={handleChange}
                options={fuelOptions}
              />
              <Select
                label="Status"
                name="status"
                value={form.status}
                onChange={handleChange}
                options={statusOptions}
              />
            </div>
          </Card>

          {/* Pricing & Details */}
          <Card padding="lg" className={styles.section}>
            <h3 className={styles.sectionTitle}>Pricing & Details</h3>
            <div className={styles.fieldGrid}>
              <Input
                label="Daily Rate ($)"
                name="dailyRate"
                type="number"
                value={form.dailyRate}
                onChange={handleChange}
                min={0}
                step={0.01}
                required
                error={errors.dailyRate?.[0]}
              />
              <Input
                label="Mileage (km)"
                name="mileage"
                type="number"
                value={form.mileage}
                onChange={handleChange}
                min={0}
              />
              <Input
                label="Insurance Expiry"
                name="insuranceExpiry"
                type="date"
                value={form.insuranceExpiry}
                onChange={handleChange}
              />
              <Input
                label="Registration Expiry"
                name="registrationExpiry"
                type="date"
                value={form.registrationExpiry}
                onChange={handleChange}
              />
            </div>
            <div className={styles.fullField}>
              <Textarea
                label="Notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </Card>
        </div>

        {/* Submit */}
        <div className={styles.actions}>
          <Button variant="secondary" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} icon={<Save size={16} />}>
            {isEdit ? "Update Vehicle" : "Add Vehicle"}
          </Button>
        </div>
      </form>
    </div>
  );
}
