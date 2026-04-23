"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { logExpense, updateExpense } from "@/actions/expenses";
import { useToast } from "@/components/ui/Toast";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: any[];
  editingExpense?: any | null;
}

const CATEGORIES = [
  "Maintenance",
  "Vignette",
  "Assurance",
  "Gasoil",
  "Visite technique",
  "Salaire",
  "CNSS",
  "Loyer",
  "Comptabilité",
  "Autre",
];

const defaultForm = {
  date: new Date().toISOString().split("T")[0],
  category: "Autre",
  amount: "",
  description: "",
  vehicleId: "",
};

export default function AddExpenseModal({ isOpen, onClose, vehicles, editingExpense }: AddExpenseModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(defaultForm);

  const isEditMode = !!editingExpense;

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        date: new Date(editingExpense.date).toISOString().split("T")[0],
        category: editingExpense.category,
        amount: editingExpense.amount.toString(),
        description: editingExpense.description || "",
        vehicleId: editingExpense.vehicleId || "",
      });
    } else {
      setFormData(defaultForm);
    }
  }, [editingExpense]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      date: formData.date,
      category: formData.category,
      amount: parseFloat(formData.amount),
      description: formData.description,
      vehicleId: formData.vehicleId || undefined,
    };

    if (isNaN(data.amount) || data.amount <= 0) {
      toast("Veuillez entrer un montant valide", "error");
      setLoading(false);
      return;
    }

    const res = isEditMode
      ? await updateExpense(editingExpense.id, data)
      : await logExpense(data);

    if (res.success) {
      toast(isEditMode ? "Charge modifiée avec succès" : "Charge ajoutée avec succès", "success");
      onClose();
      setFormData(defaultForm);
    } else {
      toast(res.message, "error");
    }

    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ backgroundColor: "var(--bg-primary)", borderRadius: "12px", border: "1px solid var(--border)", width: "100%", maxWidth: "500px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>{isEditMode ? "Modifier la charge" : "Ajouter une charge"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-tertiary)" }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={{ width: "100%", height: "40px", padding: "0 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>Catégorie</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ width: "100%", height: "40px", padding: "0 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>Montant</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              style={{ width: "100%", height: "40px", padding: "0 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>Véhicule (Optionnel)</label>
            <select
              value={formData.vehicleId}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
              style={{ width: "100%", height: "40px", padding: "0 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
            >
              <option value="">Aucun véhicule sélectionné</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} ({v.plateNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>Description (Optionnelle)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: "100%", minHeight: "80px", padding: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
            <Button variant="ghost" onClick={onClose} type="button">Annuler</Button>
            <Button type="submit" loading={loading} variant="primary">
              {isEditMode ? "Enregistrer les modifications" : "Enregistrer la charge"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
