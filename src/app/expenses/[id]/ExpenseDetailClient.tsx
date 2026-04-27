"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import AddExpenseModal from "../AddExpenseModal";
import { deleteExpense } from "@/actions/expenses";
import { useSettings } from "@/lib/SettingsContext";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

export default function ExpenseDetailClient({ expense, vehicles }: { expense: any; vehicles: any[] }) {
  const router = useRouter();
  const { t, formatPrice } = useSettings();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(t("expenses.deleteConfirm"))) return;
    setDeleting(true);
    const result = await deleteExpense(expense.id);
    setDeleting(false);

    if (result.success) {
      toast(t("expenses.deleted"), "success");
      router.push("/expenses");
    } else {
      toast(result.message, "error");
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "900px" }}>
      <div className="page-header">
        <h1>{t("expenses.description")}</h1>
        <div className="page-header-actions">
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>{t("action.back")}</Button>
          <Button icon={<Pencil size={16} />} onClick={() => setIsModalOpen(true)}>{t("action.edit")}</Button>
          <Button variant="danger" icon={<Trash2 size={16} />} loading={deleting} onClick={handleDelete} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "18px" }}>
        <Card padding="lg">
          <h3 style={{ marginBottom: "14px" }}>{t("expenses.amount")}</h3>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--danger)" }}>{formatPrice(expense.amount)}</div>
        </Card>
        <Card padding="lg">
          <h3 style={{ marginBottom: "14px" }}>{t("expenses.category")}</h3>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{expense.category}</div>
          <div style={{ marginTop: "8px", color: "var(--text-secondary)" }}>{formatDate(expense.date)}</div>
        </Card>
      </div>

      <Card padding="lg">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" }}>
          <Info label={t("expenses.description")} value={expense.description || "-"} wide />
          <Info
            label={t("expenses.vehicle")}
            value={expense.vehicle ? `${expense.vehicle.brand} ${expense.vehicle.model} - ${expense.vehicle.plateNumber}` : "-"}
          />
          <Info label={t("label.date")} value={formatDate(expense.date)} />
        </div>
      </Card>

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          router.refresh();
        }}
        vehicles={vehicles}
        editingExpense={expense}
      />
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
