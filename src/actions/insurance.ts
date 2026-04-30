"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/company";
import { canPerform } from "@/lib/permissions";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";

export async function recordInsurancePayment(input: {
  vehicleId: string;
  endDate: string;
  amount?: number;
  notes?: string;
}) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_INSURANCE"])) {
      return { success: false, message: "You do not have permission to manage insurance." };
    }
    const companyId = await requireCompanyId();
    if (!input.vehicleId || !input.endDate) {
      return { success: false, message: "Vehicle and insurance end date are required" };
    }

    const endDate = new Date(input.endDate);
    if (Number.isNaN(endDate.getTime())) {
      return { success: false, message: "Please enter a valid insurance end date" };
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
            category: "Assurance",
            amount,
            description: input.notes || "Insurance payment",
            vehicleId: input.vehicleId,
          },
        });
        expenseId = expense.id;
      }

      const insurancePayment = await tx.insurancePayment.create({
        data: {
          companyId,
          vehicleId: input.vehicleId,
          paidAt,
          endDate,
          amount,
          expenseId,
          notes: input.notes || null,
        },
      });

      await tx.vehicle.update({
        where: { id: input.vehicleId },
        data: { insuranceExpiry: endDate },
      });

      return insurancePayment;
    });

    revalidatePath("/insurance");
    revalidatePath("/expenses");
    revalidatePath("/vehicles");
    return { success: true, message: "Insurance payment recorded", data: payment };
  } catch (error) {
    console.error("Failed to record insurance payment", error);
    return { success: false, message: "Failed to record insurance payment" };
  }
}
