"use client";

import { useState } from "react";
import { TrendingDown, Plus, CreditCard, Wallet, Calculator, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { useSettings } from "@/lib/SettingsContext";
import { formatDate } from "@/lib/utils";
import AddExpenseModal from "./AddExpenseModal";
import { updateCashRegister, deleteExpense } from "@/actions/expenses";
import { useToast } from "@/components/ui/Toast";

interface ExpensesClientProps {
  expenses: any[];
  cashRegister: number;
  vehicles: any[];
}

export default function ExpensesClient({ expenses, cashRegister, vehicles }: ExpensesClientProps) {
  const { t, formatPrice } = useSettings();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState(cashRegister.toString());
  const [isSavingCash, setIsSavingCash] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalCharges = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const resteCaisse = cashRegister - totalCharges;

  const handleSaveCash = async () => {
    setIsSavingCash(true);
    const amount = parseFloat(cashInput);
    if (isNaN(amount)) {
      toast("Veuillez entrer un montant valide", "error");
      setIsSavingCash(false);
      return;
    }
    const res = await updateCashRegister(amount);
    if (res.success) {
      toast("Caisse mise à jour", "success");
      setIsEditingCash(false);
    } else {
      toast("Erreur de mise à jour", "error");
    }
    setIsSavingCash(false);
  };

  const handleEdit = (expense: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Supprimer cette charge définitivement ?")) return;
    setDeletingId(id);
    const res = await deleteExpense(id);
    setDeletingId(null);
    if (res.success) {
      toast("Charge supprimée", "success");
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
      label: "Date",
      render: (e: any) => <span>{formatDate(e.date)}</span>,
    },
    {
      key: "category",
      label: "Catégorie",
      render: (e: any) => <span style={{ fontWeight: 600 }}>{e.category}</span>,
    },
    {
      key: "description",
      label: "Description",
      render: (e: any) => <span>{e.description || "—"}</span>,
    },
    {
      key: "vehicle",
      label: "Véhicule",
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
      label: "Montant",
      render: (e: any) => (
        <span style={{ fontWeight: "bold", color: "var(--error)" }}>
          {formatPrice(e.amount)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      render: (exp: any) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => handleEdit(exp, e)}
            icon={<Pencil size={14} />}
          >
            Modifier
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
          Gestion des charges
        </h1>
        <div className="page-header-actions">
          <Button icon={<Plus size={16} />} onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}>
            Ajouter une dépense
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        {/* Card: Somme des charges */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "var(--error)" }}>
            <div style={{ padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
              <CreditCard size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>
              Somme des charges
            </h3>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)" }}>
            {formatPrice(totalCharges)}
          </div>
        </div>

        {/* Card: Montant de la caisse */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "var(--success)" }}>
            <div style={{ padding: "10px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "8px" }}>
              <Wallet size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>
              Montant de la Caisse
            </h3>
          </div>
          
          {isEditingCash ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="number"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                style={{ width: "100%", height: "40px", padding: "0 12px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
              />
              <Button onClick={handleSaveCash} loading={isSavingCash}>Enregistrer</Button>
              <Button variant="ghost" onClick={() => setIsEditingCash(false)}>Annuler</Button>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                {formatPrice(cashRegister)}
              </div>
              <Button variant="ghost" onClick={() => setIsEditingCash(true)}>Modifier</Button>
            </div>
          )}
        </div>

        {/* Card: Reste / Formule */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "var(--accent)" }}>
            <div style={{ padding: "10px", background: "var(--accent-muted)", borderRadius: "8px" }}>
              <Calculator size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>
              Reste (Caisse - Charges)
            </h3>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: resteCaisse < 0 ? "var(--error)" : "var(--success)" }}>
            {formatPrice(resteCaisse)}
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={expenses}
        keyExtractor={(e) => e.id}
        emptyMessage="Aucune charge enregistrée."
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
