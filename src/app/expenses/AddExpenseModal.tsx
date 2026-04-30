"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { logExpense, updateExpense } from "@/actions/expenses";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/SettingsContext";
import { CAR_EXPENSE_CATEGORIES, EXPENSE_CATEGORIES, normalizeExpenseCategory, translateExpenseCategory } from "@/lib/expenseCategories";
import styles from "./expenses.module.css";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: any[];
  editingExpense?: any | null;
  mode?: "general" | "car" | "cnss" | "rent" | "vignette" | "accounting";
  initialVehicleId?: string;
  initialDate?: string;
  onSuccess?: () => void;
}

const defaultForm = {
  date: new Date().toISOString().split("T")[0],
  category: "Autre",
  amount: "",
  description: "",
  vehicleId: "",
};

export default function AddExpenseModal({ isOpen, onClose, vehicles, editingExpense, mode = "general", initialVehicleId, initialDate, onSuccess }: AddExpenseModalProps) {
  const { t } = useSettings();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(defaultForm);

  const isEditMode = !!editingExpense;
  const isCarExpenseMode = mode === "car" && !isEditMode;
  const isCnssMode = mode === "cnss" && !isEditMode;
  const isRentMode = mode === "rent" && !isEditMode;
  const isVignetteMode = mode === "vignette" && !isEditMode;
  const isAccountingMode = mode === "accounting" && !isEditMode;

  const activeCategories = isCarExpenseMode
    ? CAR_EXPENSE_CATEGORIES
    : isCnssMode
      ? ["CNSS"]
      : isRentMode
        ? ["Loyer"]
        : isVignetteMode
          ? ["Vignette"]
          : isAccountingMode
            ? ["Comptabilité"]
            : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        date: new Date(editingExpense.date).toISOString().split("T")[0],
        category: normalizeExpenseCategory(editingExpense.category),
        amount: editingExpense.amount.toString(),
        description: editingExpense.description || "",
        vehicleId: editingExpense.vehicleId || "",
      });
    } else {
      let initialCategory = defaultForm.category;
      if (mode === "car") initialCategory = CAR_EXPENSE_CATEGORIES[0];
      if (mode === "cnss") initialCategory = "CNSS";
      if (mode === "rent") initialCategory = "Loyer";
      if (mode === "vignette") initialCategory = "Vignette";
      if (mode === "accounting") initialCategory = "Comptabilité";

      setFormData({
        ...defaultForm,
        date: initialDate || new Date().toISOString().split("T")[0],
        category: initialCategory,
        vehicleId: initialVehicleId || defaultForm.vehicleId,
      });
    }
  }, [editingExpense, mode, initialVehicleId, initialDate]);

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
      toast(t("expenses.invalidAmount"), "error");
      setLoading(false);
      return;
    }

    if (isCarExpenseMode && !data.vehicleId) {
      toast(t("expenses.vehicleRequired"), "error");
      setLoading(false);
      return;
    }

    const res = isEditMode
      ? await updateExpense(editingExpense.id, data)
      : await logExpense(data);

    if (res.success) {
      toast(isEditMode ? t("expenses.updated") : t("expenses.added"), "success");
      onClose();
      onSuccess?.();
      setFormData({
        ...defaultForm,
        category: mode === "car" ? CAR_EXPENSE_CATEGORIES[0] : (mode === "rent" ? "Loyer" : (mode === "cnss" ? "CNSS" : (mode === "accounting" ? "Comptabilité" : defaultForm.category))),
      });
    } else {
      toast(res.message, "error");
    }

    setLoading(false);
  };

  const modalTitle = isEditMode
    ? t("expenses.modalTitleEdit")
    : isCnssMode
      ? t("expenses.modalTitleCnss")
      : isRentMode
        ? t("expenses.modalTitleRent")
        : isAccountingMode
          ? t("expenses.modalTitleAccounting")
          : isCarExpenseMode
            ? t("expenses.modalTitleCar")
            : t("expenses.modalTitleAdd");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className={styles.modalForm}>
        {!isAccountingMode && (
        <div>
          <label className={styles.modalLabel}>{t("label.date")}</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className={styles.modalInput}
          />
        </div>
        )}

        {!isAccountingMode && (
        <div>
          <label className={styles.modalLabel}>{t("expenses.category")}</label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className={styles.modalSelect}
          >
            {activeCategories.map((cat) => (
              <option key={cat} value={cat}>{translateExpenseCategory(cat, t)}</option>
            ))}
          </select>
        </div>
        )}

        <div>
          <label className={styles.modalLabel}>{t("expenses.amount")}</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className={styles.modalInput}
          />
        </div>

        {!isCnssMode && !isRentMode && !isAccountingMode && (
          <div>
            <label className={styles.modalLabel}>
              {isCarExpenseMode ? t("expenses.vehicleRequiredLabel") : t("expenses.vehicleOptional")}
            </label>
            <select
              required={isCarExpenseMode}
              value={formData.vehicleId}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
              className={styles.modalSelect}
            >
              <option value="">{t("expenses.noVehicleSelected")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} ({v.plateNumber})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={styles.modalLabel}>{t("expenses.descriptionOptional")}</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={styles.modalTextarea}
          />
        </div>

        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose} type="button">{t("action.cancel")}</Button>
          <Button type="submit" loading={loading} variant="primary">
            {isEditMode ? t("expenses.saveEdit") : t("expenses.saveNew")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
