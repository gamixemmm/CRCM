"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface ExpenseInput {
  date: string;
  category: string;
  amount: number;
  description?: string;
  vehicleId?: string;
}

export async function getExpenses() {
  return prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: { vehicle: true },
  });
}

export async function getExpense(id: string) {
  return prisma.expense.findUnique({
    where: { id },
    include: { vehicle: true },
  });
}

export async function logExpense(input: ExpenseInput) {
  try {
    const expense = await prisma.expense.create({
      data: {
        date: new Date(input.date),
        category: input.category,
        amount: input.amount,
        description: input.description,
        vehicleId: input.vehicleId || null,
      },
    });

    revalidatePath("/expenses");
    revalidatePath("/vignette");
    return { success: true, message: "Expense logged successfully", data: expense };
  } catch (error) {
    console.error("Failed to log expense", error);
    return { success: false, message: "Failed to log expense" };
  }
}

export async function updateExpense(id: string, input: ExpenseInput) {
  try {
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        date: new Date(input.date),
        category: input.category,
        amount: input.amount,
        description: input.description || null,
        vehicleId: input.vehicleId || null,
      },
    });

    revalidatePath("/expenses");
    revalidatePath("/vignette");
    return { success: true, message: "Expense updated successfully", data: expense };
  } catch (error) {
    console.error("Failed to update expense", error);
    return { success: false, message: "Failed to update expense" };
  }
}

export async function deleteExpense(id: string) {
  try {
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/expenses");
    return { success: true, message: "Expense deleted successfully" };
  } catch (error) {
    console.error("Failed to delete expense", error);
    return { success: false, message: "Failed to delete expense" };
  }
}

export async function getGlobalSettings() {
  let settings = await prisma.globalSettings.findUnique({
    where: { id: "global" },
  });

  if (!settings) {
    settings = await prisma.globalSettings.create({
      data: { id: "global", cashRegister: 0 },
    });
  }

  return settings;
}

export async function updateCashRegister(amount: number) {
  try {
    const settings = await prisma.globalSettings.upsert({
      where: { id: "global" },
      update: { cashRegister: amount },
      create: { id: "global", cashRegister: amount },
    });

    revalidatePath("/expenses");
    return { success: true, message: "Cash register updated", data: settings };
  } catch (error) {
    console.error("Failed to update cash register", error);
    return { success: false, message: "Failed to update cash register" };
  }
}
