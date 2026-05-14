"use server";

import { prisma } from "@/lib/prisma";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { logAuditAction } from "@/lib/audit";
import { requireCompanyId } from "@/lib/company";
import { canPerform } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { getBusinessStartOfToday } from "@/lib/businessTime";

const CAR_PAYMENT_EXPENSE_CATEGORY = "Car payment";

type ActionResult = {
  success: boolean;
  message: string;
  messageKey?: string;
  data?: unknown;
};

function getCurrentMonthMarker() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

function getInstallmentExpenseDescription(vehicle: { brand?: string; model?: string; plateNumber: string }, month: number, year: number) {
  const vehicleLabel = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
  return `Car monthly payment - ${vehicleLabel ? `${vehicleLabel} - ` : ""}${vehicle.plateNumber} - ${year}-${String(month).padStart(2, "0")}`;
}

export async function saveCarInstallmentPayment(input: {
  vehicleId: string;
  monthlyPaidAmount: number;
}): Promise<ActionResult> {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["ADD_CAR_PAYMENTS"])) {
      return { success: false, message: "You do not have permission to manage vehicle payments.", messageKey: "carInstallments.noPermission" };
    }

    const companyId = await requireCompanyId();
    const monthlyPaidAmount = Number(input.monthlyPaidAmount);

    if (!input.vehicleId) {
      return { success: false, message: "Please select a vehicle.", messageKey: "carInstallments.selectVehicleError" };
    }

    if (!Number.isFinite(monthlyPaidAmount) || monthlyPaidAmount < 0) {
      return { success: false, message: "Please enter a valid monthly payment amount.", messageKey: "carInstallments.invalidMonthlyAmount" };
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: input.vehicleId, companyId },
      select: { id: true, brand: true, model: true, plateNumber: true },
    });

    if (!vehicle) {
      return { success: false, message: "Vehicle not found.", messageKey: "carInstallments.vehicleNotFound" };
    }

    const payment = await prisma.carInstallmentPayment.upsert({
      where: { vehicleId: input.vehicleId },
      create: {
        companyId,
        vehicleId: input.vehicleId,
        purchasePrice: 0,
        paidAmount: 0,
        monthlyPaidAmount,
      },
      update: {
        monthlyPaidAmount,
      },
    });

    revalidatePath("/car-installments");
    await logAuditAction({
      actor: session,
      action: "UPSERT_CAR_INSTALLMENT_PAYMENT",
      entityType: "CarInstallmentPayment",
      entityId: payment.id,
      message: `${session.name} updated installment payment for ${vehicle.plateNumber}`,
      metadata: { vehicleId: vehicle.id, monthlyPaidAmount },
    });

    return { success: true, message: "Car payment information saved.", messageKey: "carInstallments.saved", data: payment };
  } catch (error) {
    console.error("Save car installment payment error:", error);
    return { success: false, message: "Failed to save car payment information.", messageKey: "carInstallments.saveFailed" };
  }
}

export async function updateCarInstallmentMonthlyStatus(input: {
  vehicleId: string;
  status: "DONE" | "SKIPPED" | "NOT_DONE";
}): Promise<ActionResult> {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["ADD_CAR_PAYMENTS"])) {
      return { success: false, message: "You do not have permission to manage vehicle payments.", messageKey: "carInstallments.noPermission" };
    }

    const companyId = await requireCompanyId();
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: input.vehicleId, companyId },
      select: { id: true, brand: true, model: true, plateNumber: true },
    });

    if (!vehicle) {
      return { success: false, message: "Vehicle not found.", messageKey: "carInstallments.vehicleNotFound" };
    }

    const payment = await prisma.carInstallmentPayment.findUnique({
      where: { vehicleId: input.vehicleId },
    });

    if (!payment) {
      return { success: false, message: "Please save the car payment information first.", messageKey: "carInstallments.saveInfoFirst" };
    }

    const { month, year } = getCurrentMonthMarker();
    const expenseDescription = getInstallmentExpenseDescription(vehicle, month, year);

    if (input.status === "DONE" && payment.monthlyPaidAmount <= 0) {
      return { success: false, message: "Please enter a valid monthly payment amount.", messageKey: "carInstallments.invalidMonthlyAmount" };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const installment = await tx.carInstallmentPayment.update({
        where: { vehicleId: input.vehicleId },
        data: {
          monthlyPaymentStatus: input.status,
          monthlyPaymentMonth: month,
          monthlyPaymentYear: year,
        },
      });

      if (input.status === "DONE") {
        const existingExpense = await tx.expense.findFirst({
          where: {
            companyId,
            vehicleId: vehicle.id,
            category: { in: [CAR_PAYMENT_EXPENSE_CATEGORY, "Autre"] },
            description: expenseDescription,
          },
        });

        if (existingExpense) {
          await tx.expense.update({
            where: { id: existingExpense.id },
            data: {
              category: CAR_PAYMENT_EXPENSE_CATEGORY,
              amount: payment.monthlyPaidAmount,
              date: getBusinessStartOfToday(),
            },
          });
        } else {
          await tx.expense.create({
            data: {
              companyId,
              vehicleId: vehicle.id,
              date: getBusinessStartOfToday(),
              category: CAR_PAYMENT_EXPENSE_CATEGORY,
              amount: payment.monthlyPaidAmount,
              description: expenseDescription,
            },
          });
        }
      } else {
        await tx.expense.deleteMany({
          where: {
            companyId,
            vehicleId: vehicle.id,
            category: { in: [CAR_PAYMENT_EXPENSE_CATEGORY, "Autre"] },
            description: expenseDescription,
          },
        });
      }

      return installment;
    });

    revalidatePath("/car-installments");
    revalidatePath("/expenses");
    const action =
      input.status === "DONE"
        ? "MARK_CAR_INSTALLMENT_PAID"
        : input.status === "SKIPPED"
          ? "SKIP_CAR_INSTALLMENT_MONTH"
          : "MARK_CAR_INSTALLMENT_UNPAID";

    await logAuditAction({
      actor: session,
      action,
      entityType: "CarInstallmentPayment",
      entityId: updated.id,
      message: `${session.name} marked car installment month as ${input.status.toLowerCase()} for ${vehicle.plateNumber}`,
      metadata: { vehicleId: vehicle.id, status: input.status, month, year },
    });

    return {
      success: true,
      message: input.status === "DONE"
        ? "Car payment recorded."
        : input.status === "SKIPPED"
          ? "This month was skipped."
          : "This month was marked unpaid.",
      messageKey: input.status === "DONE"
        ? "carInstallments.paymentRecorded"
        : input.status === "SKIPPED"
          ? "carInstallments.monthSkipped"
          : "carInstallments.monthMarkedUnpaid",
      data: updated,
    };
  } catch (error) {
    console.error("Update car installment monthly status error:", error);
    return { success: false, message: "Failed to update monthly payment status.", messageKey: "carInstallments.updateMonthlyFailed" };
  }
}
