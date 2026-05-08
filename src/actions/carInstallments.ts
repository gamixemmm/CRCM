"use server";

import { prisma } from "@/lib/prisma";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { logAuditAction } from "@/lib/audit";
import { requireCompanyId } from "@/lib/company";
import { canPerform } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

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

export async function saveCarInstallmentPayment(input: {
  vehicleId: string;
  monthlyPaidAmount: number;
}): Promise<ActionResult> {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_VEHICLES"])) {
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
  status: "DONE" | "SKIPPED";
}): Promise<ActionResult> {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_VEHICLES"])) {
      return { success: false, message: "You do not have permission to manage vehicle payments.", messageKey: "carInstallments.noPermission" };
    }

    const companyId = await requireCompanyId();
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: input.vehicleId, companyId },
      select: { id: true, plateNumber: true },
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

    const updated = await prisma.carInstallmentPayment.update({
      where: { vehicleId: input.vehicleId },
      data: {
        monthlyPaymentStatus: input.status,
        monthlyPaymentMonth: month,
        monthlyPaymentYear: year,
      },
    });

    revalidatePath("/car-installments");
    await logAuditAction({
      actor: session,
      action: input.status === "DONE" ? "MARK_CAR_INSTALLMENT_PAID" : "SKIP_CAR_INSTALLMENT_MONTH",
      entityType: "CarInstallmentPayment",
      entityId: updated.id,
      message: `${session.name} marked car installment month as ${input.status.toLowerCase()} for ${vehicle.plateNumber}`,
      metadata: { vehicleId: vehicle.id, status: input.status, month, year },
    });

    return {
      success: true,
      message: input.status === "DONE" ? "Car payment recorded." : "This month was skipped.",
      messageKey: input.status === "DONE" ? "carInstallments.paymentRecorded" : "carInstallments.monthSkipped",
      data: updated,
    };
  } catch (error) {
    console.error("Update car installment monthly status error:", error);
    return { success: false, message: "Failed to update monthly payment status.", messageKey: "carInstallments.updateMonthlyFailed" };
  }
}
