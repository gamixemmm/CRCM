"use client";

import { useState } from "react";
import { TrendingDown, Plus, CreditCard, Wallet, Calculator, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { useSettings } from "@/lib/SettingsContext";
import { formatDate } from "@/lib/utils";
import AddExpenseModal from "./AddExpenseModal";
import { deleteExpense } from "@/actions/expenses";
import { useToast } from "@/components/ui/Toast";

interface ExpensesClientProps {
  expenses: any[];
  overallRevenue: number;
  vehicles: any[];
}

const CATEGORY_KEY_MAP: Record<string, string> = {
  "Maintenance": "expenses.cat.maintenance",
  "Vignette": "expenses.cat.vignette",
  "Assurance": "expenses.cat.insurance",
  "Gasoil": "expenses.cat.fuel",
  "Visite technique": "expenses.cat.inspection",
  "Salaire": "expenses.cat.salary",
  "CNSS": "expenses.cat.cnss",
  "Loyer": "expenses.cat.rent",
  "Comptabilité": "expenses.cat.accounting",
  "Autre": "expenses.cat.other",
};

export default function ExpensesClient({ expenses, overallRevenue, vehicles }: ExpensesClientProps) {
  const { t, formatPrice } = useSettings();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalCharges = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const reste = overallRevenue - totalCharges;

  const translateCategory = (cat: string) => {
    const key = CATEGORY_KEY_MAP[cat];
    if (key) return t(key as any);
    return cat;
  };

  const handleEdit = (expense: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t("expenses.deleteConfirm"))) return;
    setDeletingId(id);
    const res = await deleteExpense(id);
    setDeletingId(null);
    if (res.success) {
      toast(t("expenses.deleted"), "success");
    } else {
      toast(res.message, "error");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const columns = [
    {
      key: "date",
      label: t("label.date"),
      render: (e: any) => <span>{formatDate(e.date)}</span>,
    },
    {
      key: "category",
      label: t("expenses.category"),
      render: (e: any) => <span style={{ fontWeight: 600 }}>{translateCategory(e.category)}</span>,
    },
    {
      key: "description",
      label: t("expenses.description"),
      render: (e: any) => <span>{e.description || "—"}</span>,
    },
    {
      key: "vehicle",
      label: t("expenses.vehicle"),
      render: (e: any) => e.vehicle ? (
        <span style={{ color: "var(--text-secondary)" }}>
          {e.vehicle.brand} {e.vehicle.model} - {e.vehicle.plateNumber}
        </span>
      ) : (
        "—"
      ),
    },
    {
      key: "amount",
      label: t("expenses.amount"),
      render: (e: any) => (
        <span style={{ fontWeight: "bold", color: "var(--error)" }}>
          {formatPrice(e.amount)}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("label.actions"),
      align: "right" as const,
      render: (exp: any) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => handleEdit(exp, e)}
            icon={<Pencil size={14} />}
          >
            {t("expenses.edit")}
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={deletingId === exp.id}
            onClick={(e) => handleDelete(exp.id, e)}
            icon={<Trash2 size={14} />}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>
          <TrendingDown size={24} />
          {t("expenses.title")}
        </h1>
        <div className="page-header-actions">
          <Button icon={<Plus size={16} />} onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}>
            {t("expenses.addExpense")}
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        {/* Card: Total Charges */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "var(--error)" }}>
            <div style={{ padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
              <CreditCard size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>
              {t("expenses.totalCharges")}
            </h3>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)" }}>
            {formatPrice(totalCharges)}
          </div>
        </div>

        {/* Card: Cash Amount (Overall Revenue from invoices) */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "var(--success)" }}>
            <div style={{ padding: "10px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "8px" }}>
              <Wallet size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>
              {t("expenses.cashAmount")}
            </h3>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)" }}>
            {formatPrice(overallRevenue)}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "8px" }}>
            {t("expenses.cashSubtitle")}
          </div>
        </div>

        {/* Card: Remainder = Revenue - Charges */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "var(--accent)" }}>
            <div style={{ padding: "10px", background: "var(--accent-muted)", borderRadius: "8px" }}>
              <Calculator size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>
              {t("expenses.remainder")}
            </h3>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: reste < 0 ? "var(--error)" : "var(--success)" }}>
            {formatPrice(reste)}
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={expenses}
        keyExtractor={(e) => e.id}
        emptyMessage={t("expenses.noExpenses")}
      />

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        vehicles={vehicles}
        editingExpense={editingExpense}
      />
    </div>
  );
}
