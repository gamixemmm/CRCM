"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/company";

export async function markVignettePaid(input: {
  vehicleId: string;
  year: number;
  amount?: number;
  notes?: string;
}) {
  try {
    const companyId = await requireCompanyId();
    if (!input.vehicleId || !input.year) {
      return { success: false, message: "Vehicle and year are required" };
    }

    const amount = input.amount ?? 0;
    if (Number.isNaN(amount) || amount < 0) {
      return { success: false, message: "Please enter a valid amount" };
    }

    const paidAt = new Date();

    const payment = await prisma.$transaction(async (tx) => {
      let expenseId: string | null = null;

      if (amount > 0) {
        const expense = await tx.expense.create({
          data: {
            companyId,
            date: paidAt,
            category: "Vignette",
            amount,
            description: input.notes || `Vignette ${input.year}`,
            vehicleId: input.vehicleId,
          },
        });
        expenseId = expense.id;
      }

      return tx.vignettePayment.upsert({
        where: {
          companyId_vehicleId_year: {
            companyId,
            vehicleId: input.vehicleId,
            year: input.year,
          },
        },
        update: {
          companyId,
          paidAt,
          amount,
          expenseId,
          notes: input.notes || null,
        },
        create: {
          companyId,
          vehicleId: input.vehicleId,
          year: input.year,
          paidAt,
          amount,
          expenseId,
          notes: input.notes || null,
        },
      });
    });

    revalidatePath("/vignette");
    revalidatePath("/expenses");
    return { success: true, message: "Vignette marked as paid", data: payment };
  } catch (error) {
    console.error("Failed to mark vignette paid", error);
    return { success: false, message: "Failed to mark vignette paid" };
  }
}
