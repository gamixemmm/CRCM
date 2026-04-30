"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/company";
import { canPerform } from "@/lib/permissions";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { normalizeExpenseCategory } from "@/lib/expenseCategories";
import { logAuditAction } from "@/lib/audit";

interface ExpenseInput {
  date: string;
  category: string;
  amount: number;
  description?: string;
  vehicleId?: string;
}

export async function getExpenses() {
  const companyId = await requireCompanyId();
  return prisma.expense.findMany({
    where: { companyId },
    orderBy: { date: "desc" },
    include: { vehicle: true },
  });
}

export async function getExpense(id: string) {
  const companyId = await requireCompanyId();
  return prisma.expense.findFirst({
    where: { id, companyId },
    include: { vehicle: true },
  });
}

export async function logExpense(input: ExpenseInput) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["ADD_EXPENSE_PAYMENTS"])) {
      return { success: false, message: "You do not have permission to add expense payments." };
    }
    const companyId = await requireCompanyId();
    const expense = await prisma.expense.create({
      data: {
        companyId,
        date: new Date(input.date),
        category: normalizeExpenseCategory(input.category),
        amount: input.amount,
        description: input.description,
        vehicleId: input.vehicleId || null,
      },
    });

    revalidatePath("/expenses");
    revalidatePath("/vignette");
    await logAuditAction({
      actor: session,
      action: "CREATE_EXPENSE",
      entityType: "Expense",
      entityId: expense.id,
      message: `${session.name} created expense ${normalizeExpenseCategory(input.category)} (${input.amount})`,
      metadata: { category: normalizeExpenseCategory(input.category), amount: input.amount, vehicleId: input.vehicleId || null },
    });
    return { success: true, message: "Expense logged successfully", data: expense };
  } catch (error) {
    console.error("Failed to log expense", error);
    return { success: false, message: "Failed to log expense" };
  }
}

export async function updateExpense(id: string, input: ExpenseInput) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_EXPENSES"])) {
      return { success: false, message: "You do not have permission to manage expenses." };
    }
    const companyId = await requireCompanyId();
    const current = await prisma.expense.findFirst({ where: { id, companyId } });
    if (!current) {
      return { success: false, message: "Expense not found" };
    }
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        companyId,
        date: new Date(input.date),
        category: normalizeExpenseCategory(input.category),
        amount: input.amount,
        description: input.description || null,
        vehicleId: input.vehicleId || null,
      },
    });

    revalidatePath("/expenses");
    revalidatePath("/vignette");
    await logAuditAction({
      actor: session,
      action: "UPDATE_EXPENSE",
      entityType: "Expense",
      entityId: expense.id,
      message: `${session.name} updated expense ${normalizeExpenseCategory(input.category)} (${input.amount})`,
      metadata: { category: normalizeExpenseCategory(input.category), amount: input.amount, vehicleId: input.vehicleId || null },
    });
    return { success: true, message: "Expense updated successfully", data: expense };
  } catch (error) {
    console.error("Failed to update expense", error);
    return { success: false, message: "Failed to update expense" };
  }
}

export async function deleteExpense(id: string) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_EXPENSES"])) {
      return { success: false, message: "You do not have permission to manage expenses." };
    }
    const companyId = await requireCompanyId();
    const current = await prisma.expense.findFirst({ where: { id, companyId } });
    if (!current) {
      return { success: false, message: "Expense not found" };
    }
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/expenses");
    await logAuditAction({
      actor: session,
      action: "DELETE_EXPENSE",
      entityType: "Expense",
      entityId: id,
      message: `${session.name} deleted expense ${current.category} (${current.amount})`,
    });
    return { success: true, message: "Expense deleted successfully" };
  } catch (error) {
    console.error("Failed to delete expense", error);
    return { success: false, message: "Failed to delete expense" };
  }
}

export async function getGlobalSettings() {
  const companyId = await requireCompanyId();
  let settings = await prisma.globalSettings.findFirst({
    where: { companyId },
  });

  if (!settings) {
    settings = await prisma.globalSettings.create({
      data: { id: "global", companyId, cashRegister: 0 },
    });
  }

  return settings;
}

export async function updateCashRegister(amount: number) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_EXPENSES"])) {
      return { success: false, message: "You do not have permission to manage expenses." };
    }
    const companyId = await requireCompanyId();
    const settings = await prisma.globalSettings.upsert({
      where: { companyId },
      update: { cashRegister: amount },
      create: { id: "global", companyId, cashRegister: amount },
    });

    revalidatePath("/expenses");
    await logAuditAction({
      actor: session,
      action: "UPDATE_CASH_REGISTER",
      entityType: "GlobalSettings",
      entityId: settings.id,
      message: `${session.name} updated cash register to ${amount}`,
      metadata: { amount },
    });
    return { success: true, message: "Cash register updated", data: settings };
  } catch (error) {
    console.error("Failed to update cash register", error);
    return { success: false, message: "Failed to update cash register" };
  }
}
