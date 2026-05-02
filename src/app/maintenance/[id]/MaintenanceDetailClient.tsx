"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Textarea } from "@/components/ui/Input";
import { updateMaintenance } from "@/actions/maintenance";
import { useSettings } from "@/lib/SettingsContext";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { parseMaintenanceDetails, translateMaintenanceText, translateMaintenanceValue } from "@/lib/maintenanceDetails";
import styles from "../maintenance.module.css";

export default function MaintenanceDetailClient({ log }: { log: any }) {
  const router = useRouter();
  const { t, formatPrice } = useSettings();
  const { toast } = useToast();
  const detailGroups = parseMaintenanceDetails(log.partsUsed || []);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    serviceDate: new Date(log.serviceDate).toISOString().split("T")[0],
    returnDate: log.returnDate ? new Date(log.returnDate).toISOString().split("T")[0] : "",
    type: log.type || "",
    description: log.description || "",
    cost: log.cost || 0,
    serviceProvider: log.serviceProvider || "",
    mileageAtService: log.mileageAtService || log.vehicle?.mileage || 0,
    partsUsed: (log.partsUsed || []).join("\n"),
    notes: log.notes || "",
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isActive = !log.returnDate || new Date(log.returnDate) > today;

  const save = async () => {
    setSaving(true);
    const result = await updateMaintenance(log.id, {
      ...form,
      returnDate: form.returnDate,
      cost: Number(form.cost),
      mileageAtService: Number(form.mileageAtService),
      partsUsed: form.partsUsed.split("\n").map((item: string) => item.trim()).filter(Boolean),
    });
    setSaving(false);

    if (result.success) {
      toast(result.message, "success");
      setEditing(false);
      router.refresh();
    } else {
      toast(result.message, "error");
    }
  };

  return (
    <div className={`animate-fade-in ${styles.detailPage}`}>
      <div className={`page-header ${styles.detailHeader}`}>
        <h1>{t("maintenance.title")}</h1>
        <div className={styles.detailActions}>
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>{t("action.back")}</Button>
          {editing ? (
            <Button icon={<Save size={16} />} loading={saving} onClick={save}>{t("action.save")}</Button>
          ) : (
            <Button icon={<Pencil size={16} />} onClick={() => setEditing(true)}>{t("action.edit")}</Button>
          )}
        </div>
      </div>

      <div className={styles.detailTopGrid}>
        <Card padding="lg">
          <h3 style={{ marginBottom: "16px" }}>{t("bookings.vehicle")}</h3>
          <div style={{ display: "grid", gap: "8px" }}>
            <strong>{log.vehicle?.brand} {log.vehicle?.model}</strong>
            <span style={{ color: "var(--text-secondary)" }}>{log.vehicle?.plateNumber}</span>
            <span style={{ color: "var(--text-secondary)" }}>{t("vehicles.mileage")}: {(log.vehicle?.mileage || 0).toLocaleString()} km</span>
          </div>
        </Card>

        <Card padding="lg">
          <h3 style={{ marginBottom: "16px" }}>{t("maintenance.repairCost")}</h3>
          <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{formatPrice(Number(form.cost || 0))}</div>
          <div style={{ marginTop: "8px", color: "var(--text-secondary)" }}>
            {isActive ? t("status.active") : t("status.completed")}
          </div>
        </Card>
      </div>

      <Card padding="lg">
        {!editing && detailGroups.length > 0 && (
          <div style={{ marginBottom: "18px" }}>
            <h3 style={{ marginBottom: "12px" }}>{t("maintenance.servicesComponents")}</h3>
            <div className={styles.detailCardGrid}>
              {detailGroups.map((group) => (
                <div key={group.intervention} style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-primary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                    <strong style={{ color: "var(--accent)" }}>{translateMaintenanceValue(group.intervention, t)}</strong>
                    {group.cost !== undefined && (
                      <span style={{ fontWeight: 800 }}>{formatPrice(group.cost)}</span>
                    )}
                  </div>
                  {group.items.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {group.items.map((item) => (
                        <span key={item} style={{ padding: "5px 8px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--bg-secondary)", fontSize: "0.78rem", fontWeight: 600 }}>
                          {translateMaintenanceValue(item, t)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{t("maintenance.noComponents")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className={styles.detailInfoGrid}>
          {editing ? (
            <>
              <Input label={t("maintenance.serviceDate")} type="date" value={form.serviceDate} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} />
              <Input label={t("bookings.returnDate")} type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
              <Input label={t("maintenance.interventionType")} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
              <Input label={t("maintenance.shopName")} value={form.serviceProvider} onChange={(e) => setForm({ ...form, serviceProvider: e.target.value })} />
              <Input label={`${t("maintenance.repairCostLabel")}`} type="number" min={0} value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
              <Input label={t("vehicles.mileage")} type="number" min={log.vehicle?.mileage || 0} value={form.mileageAtService} onChange={(e) => setForm({ ...form, mileageAtService: Number(e.target.value) })} />
              <Textarea label={t("maintenance.serviceDesc")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              <Textarea label={t("maintenance.partsUsed")} value={form.partsUsed} onChange={(e) => setForm({ ...form, partsUsed: e.target.value })} rows={3} />
              <div style={{ gridColumn: "1 / -1" }}>
                <Textarea label={t("maintenance.secondaryNotes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
            </>
          ) : (
            <>
              <Info label={t("maintenance.serviceDate")} value={formatDate(log.serviceDate)} />
              <Info label={t("bookings.returnDate")} value={log.returnDate ? formatDate(log.returnDate) : t("maintenance.stillInShop")} />
              <Info label={t("maintenance.interventionType")} value={translateMaintenanceText(log.type, t)} />
              <Info label={t("maintenance.shopName")} value={log.serviceProvider || "-"} />
              <Info label={t("vehicles.mileage")} value={`${(log.mileageAtService || 0).toLocaleString()} km`} />
              <Info label={t("maintenance.serviceDesc")} value={log.description ? translateMaintenanceText(log.description, t) : "-"} />
              {detailGroups.length === 0 && (
                <Info label={t("maintenance.partsUsed")} value={log.partsUsed?.length ? log.partsUsed.map((item: string) => translateMaintenanceText(item, t)).join(", ") : "-"} wide />
              )}
              <Info label={t("maintenance.secondaryNotes")} value={log.notes || "-"} wide />
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : undefined, padding: "12px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-primary)" }}>
      <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 700, marginBottom: "6px" }}>{label}</div>
      <div style={{ color: "var(--text-primary)", fontWeight: 600, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}
