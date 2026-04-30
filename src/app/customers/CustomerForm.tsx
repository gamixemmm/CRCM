"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createCustomer } from "@/actions/customers";
import { useSettings } from "@/lib/SettingsContext";
import styles from "./customers.module.css";

export default function CustomerForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useSettings();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    licenseNumber: "",
    licenseExpiry: "",
    address: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await createCustomer(form);
    setLoading(false);

    if (result.success) {
      toast(result.message, "success");
      router.push("/customers");
    } else {
      toast(result.message, "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>{t("customers.addCustomer")}</h1>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
          {t("action.back")}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className={styles.formPage}>
        
        <div className={styles.formGrid}>
          
          <Card padding="lg">
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>{t("customers.brokerInfo")}</h3>
            <div className={styles.formCardStack}>
              <div className={styles.formNameRow}>
                <Input
                  label={t("customers.firstName")}
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
                <Input
                  label={t("customers.lastName")}
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
              <Input
                label={t("customers.phone")}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                hint={t("label.optional")}
              />
              <Input
                label={t("customers.email")}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label={t("customers.address")}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </Card>

          <Card padding="lg">
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>{t("customers.identityDocument")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Input
                label={t("customers.licenseCinNumber")}
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                hint={t("label.optional")}
              />
              <Input
                label={t("customers.licenseExpiry")}
                type="date"
                value={form.licenseExpiry}
                onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
              />
            </div>
          </Card>

        </div>

        <Card padding="lg">
          <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>{t("customers.additionalNotes")}</h3>
          <Textarea 
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder={t("customers.notesPlaceholder")}
            rows={3} 
          />
        </Card>

        <div className={styles.formActions}>
          <Button variant="secondary" type="button" onClick={() => router.back()}>{t("action.cancel")}</Button>
          <Button type="submit" loading={loading} icon={<Save size={16} />}>{t("customers.saveBroker")}</Button>
        </div>
      </form>
    </div>
  );
}
