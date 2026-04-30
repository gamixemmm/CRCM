"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/company";
import { canPerform } from "@/lib/permissions";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { logAuditAction } from "@/lib/audit";

export async function completeTechnicalInspection(input: {
  vehicleId: string;
  nextDueDate: string;
  cost?: number;
  notes?: string;
}) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_TECHNICAL_INSPECTION"])) {
      return { success: false, message: "You do not have permission to manage technical inspections." };
    }
    const companyId = await requireCompanyId();
    if (!input.vehicleId || !input.nextDueDate) {
      return { success: false, message: "Vehicle and next checkup date are required" };
    }

    const nextDueDate = new Date(input.nextDueDate);
    if (Number.isNaN(nextDueDate.getTime())) {
      return { success: false, message: "Please enter a valid next checkup date" };
    }

    const cost = input.cost ?? 0;
    if (Number.isNaN(cost) || cost < 0) {
      return { success: false, message: "Please enter a valid amount" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const inspection = await tx.technicalInspection.create({
        data: {
          companyId,
          vehicleId: input.vehicleId,
          inspectionDate: new Date(),
          nextDueDate,
          notes: input.notes || null,
        },
      });

      if (cost > 0) {
        await tx.expense.create({
          data: {
            companyId,
            date: new Date(),
            category: "Visite technique",
            amount: cost,
            description: input.notes || "Visite technique",
            vehicleId: input.vehicleId,
          },
        });
      }

      return inspection;
    });

    revalidatePath("/technical-inspection");
    revalidatePath("/expenses");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "COMPLETE_TECHNICAL_INSPECTION",
      entityType: "TechnicalInspection",
      entityId: result.id,
      message: `${session.name} completed technical inspection`,
      metadata: { vehicleId: input.vehicleId, cost, nextDueDate: input.nextDueDate },
    });
    return { success: true, message: "Technical inspection recorded", data: result };
  } catch (error) {
    console.error("Failed to record technical inspection", error);
    return { success: false, message: "Failed to record technical inspection" };
  }
}
