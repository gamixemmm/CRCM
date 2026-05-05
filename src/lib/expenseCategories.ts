import type { TranslationKey } from "@/lib/translations";
import { translateMaintenanceText } from "@/lib/maintenanceDetails";

type ExpenseTranslator = (key: TranslationKey) => string;

export const EXPENSE_CATEGORIES = [
  "Maintenance",
  "Vignette",
  "Assurance",
  "Gasoil",
  "AdBlue",
  "Lavage",
  "Visite technique",
  "Salaire",
  "CNSS",
  "Loyer",
  "Mouvement",
  "Comptabilité",
  "Autre",
] as const;

export const CAR_EXPENSE_CATEGORIES = [
  "Vignette",
  "Assurance",
  "Gasoil",
  "AdBlue",
  "Lavage",
  "Visite technique",
  "Autre",
] as const;

const CATEGORY_TRANSLATION_KEYS: Record<string, TranslationKey> = {
  Maintenance: "expenses.cat.maintenance",
  Vignette: "expenses.cat.vignette",
  Assurance: "expenses.cat.insurance",
  Gasoil: "expenses.cat.fuel",
  AdBlue: "expenses.cat.adblue",
  Lavage: "expenses.cat.wash",
  "Visite technique": "expenses.cat.inspection",
  Salaire: "expenses.cat.salary",
  CNSS: "expenses.cat.cnss",
  Loyer: "expenses.cat.rent",
  Mouvement: "expenses.cat.movement",
  Comptabilité: "expenses.cat.accounting",
  Autre: "expenses.cat.other",
};

const CATEGORY_ALIASES: Record<string, string> = {
  Insurance: "Assurance",
  Fuel: "Gasoil",
  DEF: "AdBlue",
  Wash: "Lavage",
  Washing: "Lavage",
  CarWash: "Lavage",
  "Car Wash": "Lavage",
  "Technical Inspection": "Visite technique",
  Salary: "Salaire",
  Rent: "Loyer",
  Movement: "Mouvement",
  Accounting: "Comptabilité",
  Other: "Autre",
  "ComptabilitÃ©": "Comptabilité",
};

export function normalizeExpenseCategory(category: string) {
  return CATEGORY_ALIASES[category] || category;
}

export function translateExpenseCategory(category: string, translate: ExpenseTranslator) {
  const normalized = normalizeExpenseCategory(category);
  const key = CATEGORY_TRANSLATION_KEYS[normalized];
  return key ? translate(key) : category;
}

export function translateExpenseDescription(description: string | null | undefined, translate: ExpenseTranslator) {
  if (!description) return "";

  if (description.startsWith("Salary payment - ")) {
    return `${translate("expenses.desc.salaryPayment")} - ${description.slice("Salary payment - ".length)}`;
  }

  if (description.startsWith("Paiement salaire - ")) {
    return `${translate("expenses.desc.salaryPayment")} - ${description.slice("Paiement salaire - ".length)}`;
  }

  if (description.startsWith("Movement payment - ")) {
    return `${translate("expenses.desc.movementPayment")} - ${description.slice("Movement payment - ".length)}`;
  }

  if (description === "Insurance payment" || description === "Paiement assurance") {
    return translate("expenses.desc.insurancePayment");
  }

  if (description === "Technical inspection" || description === "Visite technique") {
    return translate("expenses.desc.technicalInspection");
  }

  const maintenanceMatch = description.match(/^Maintenance \((.*)\): (.*)$/);
  if (maintenanceMatch) {
    return `${translate("expenses.desc.maintenance")} (${translateMaintenanceText(maintenanceMatch[1], translate)}): ${translateMaintenanceText(maintenanceMatch[2], translate)}`;
  }

  return description;
}
