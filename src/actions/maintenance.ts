"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/company";
import { canPerform } from "@/lib/permissions";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { logAuditAction } from "@/lib/audit";
import { getBusinessStartOfToday } from "@/lib/businessTime";

interface MaintenanceInput {
  vehicleId: string;
  serviceDate: string;
  returnDate?: string;
  description: string;
  cost: number;
  serviceProvider?: string;
  notes?: string;
  type: string;
  partsUsed: string[];
  mileageAtService?: number;
}

export async function getMaintenanceLog(id: string) {
  const companyId = await requireCompanyId();
  return prisma.maintenance.findFirst({
    where: { id, companyId },
    include: { vehicle: true },
  });
}

export async function getMaintenanceLogs(params?: { status?: string; search?: string }) {
  const companyId = await requireCompanyId();
  const where: Record<string, unknown> = {};
  where.companyId = companyId;
  const today = getBusinessStartOfToday();

  if (params?.status && params.status !== "ALL") {
    if (params.status === "ACTIVE") {
      where.OR = [{ returnDate: null }, { returnDate: { gt: today } }];
    }
    if (params.status === "COMPLETED") {
      where.returnDate = { lte: today };
    }
  }

  if (params?.search) {
    where.OR = [
      { description: { contains: params.search, mode: "insensitive" } },
      { serviceProvider: { contains: params.search, mode: "insensitive" } },
      { vehicle: { plateNumber: { contains: params.search, mode: "insensitive" } } },
      { vehicle: { model: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  return prisma.maintenance.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      vehicle: true,
    },
  });
}

export async function updateMaintenance(id: string, input: Partial<MaintenanceInput>) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_MAINTENANCE"])) {
      return { success: false, message: "You do not have permission to manage maintenance." };
    }
    const companyId = await requireCompanyId();
    const current = await prisma.maintenance.findFirst({
      where: { id, companyId },
      include: { vehicle: true },
    });

    if (!current) return { success: false, message: "Maintenance log not found" };

    if (input.mileageAtService !== undefined && input.mileageAtService < current.vehicle.mileage) {
      return { success: false, message: "New mileage cannot be less than current mileage" };
    }

    const today = getBusinessStartOfToday();

    const data: Record<string, unknown> = {};
    if (input.serviceDate !== undefined) data.serviceDate = new Date(input.serviceDate);
    if (input.returnDate !== undefined) data.returnDate = input.returnDate ? new Date(input.returnDate) : null;
    if (input.description !== undefined) data.description = input.description;
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.serviceProvider !== undefined) data.serviceProvider = input.serviceProvider || null;
    if (input.notes !== undefined) data.notes = input.notes || null;
    if (input.type !== undefined) data.type = input.type;
    if (input.partsUsed !== undefined) data.partsUsed = input.partsUsed;
    if (input.mileageAtService !== undefined) data.mileageAtService = input.mileageAtService;

    const updated = await prisma.$transaction(async (tx) => {
      const log = await tx.maintenance.update({ where: { id }, data });
      const returnDate = log.returnDate ? new Date(log.returnDate) : null;
      returnDate?.setHours(0, 0, 0, 0);
      const serviceDate = new Date(log.serviceDate);
      serviceDate.setHours(0, 0, 0, 0);
      const isActiveMaintenance = serviceDate <= today && (!returnDate || returnDate > today);

      if (input.mileageAtService !== undefined) {
        await tx.vehicle.update({
          where: { id: current.vehicleId },
          data: {
            mileage: input.mileageAtService,
            ...(current.vehicle.status !== "RENTED" ? { status: isActiveMaintenance ? "MAINTENANCE" : "AVAILABLE" } : {}),
          },
        });
      } else if ((input.serviceDate !== undefined || input.returnDate !== undefined) && current.vehicle.status !== "RENTED") {
        await tx.vehicle.update({
          where: { id: current.vehicleId },
          data: {
            status: isActiveMaintenance ? "MAINTENANCE" : "AVAILABLE",
          },
        });
      }

      return log;
    });

    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${id}`);
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${current.vehicleId}`);
    await logAuditAction({
      actor: session,
      action: "UPDATE_MAINTENANCE",
      entityType: "Maintenance",
      entityId: updated.id,
      message: `${session.name} updated maintenance log`,
      metadata: { vehicleId: current.vehicleId },
    });

    return { success: true, message: "Maintenance updated successfully", data: updated };
  } catch (error) {
    console.error("Failed to update maintenance", error);
    return { success: false, message: "Failed to update maintenance" };
  }
}

export async function getMaintenanceServiceProviders() {
  const companyId = await requireCompanyId();
  const providers = await prisma.maintenance.findMany({
    where: {
      companyId,
      serviceProvider: {
        not: null,
      },
    },
    select: {
      serviceProvider: true,
    },
    distinct: ["serviceProvider"],
    orderBy: {
      serviceProvider: "asc",
    },
  });

  return providers
    .map((provider) => provider.serviceProvider?.trim())
    .filter((provider): provider is string => Boolean(provider));
}

export async function logMaintenance(input: MaintenanceInput) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["CREATE_MAINTENANCE"])) {
      return { success: false, message: "You do not have permission to create maintenance." };
    }
    const companyId = await requireCompanyId();
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: input.vehicleId, companyId }
    });

    if (!vehicle) return { success: false, message: "Vehicle not found" };
    if (input.mileageAtService !== undefined && input.mileageAtService < vehicle.mileage) {
      return { success: false, message: "New mileage cannot be less than current mileage" };
    }

    const serviceDate = new Date(input.serviceDate);
    const today = getBusinessStartOfToday();
    const returnDate = input.returnDate ? new Date(input.returnDate) : null;
    returnDate?.setHours(0, 0, 0, 0);
    const isServiceToday = serviceDate <= today;
    const isStillInMaintenance = !returnDate || returnDate > today;

    const log = await prisma.$transaction(async (tx) => {
      // Create log
      const m = await tx.maintenance.create({
        data: {
          companyId,
          vehicleId: input.vehicleId,
          serviceDate,
          returnDate,
          description: input.description,
          cost: input.cost,
          serviceProvider: input.serviceProvider || null,
          notes: input.notes || null,
          type: input.type,
          partsUsed: input.partsUsed,
          mileageAtService: input.mileageAtService || vehicle.mileage,
        },
      });

      // Keep vehicles unavailable while an active or future-dated workshop job is open.
      const vehicleUpdateData: { status?: string; mileage?: number } = {};

      if (input.mileageAtService !== undefined) {
        vehicleUpdateData.mileage = input.mileageAtService;
      }

      if (isServiceToday && vehicle.status !== "RENTED" && isStillInMaintenance) {
        vehicleUpdateData.status = "MAINTENANCE";
      }

      if (Object.keys(vehicleUpdateData).length > 0) {
        await tx.vehicle.update({
          where: { id: input.vehicleId },
          data: vehicleUpdateData,
        });
      }

      // Auto-create an expense if cost > 0
      if (input.cost > 0) {
          await tx.expense.create({
            data: {
              companyId,
              date: serviceDate,
            category: "Maintenance",
            amount: input.cost,
            description: `Maintenance (${input.type}): ${input.description}`,
            vehicleId: input.vehicleId,
          }
        });
      }

      return m;
    });

    revalidatePath("/maintenance");
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${input.vehicleId}`);
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "CREATE_MAINTENANCE",
      entityType: "Maintenance",
      entityId: log.id,
      message: `${session.name} created maintenance log`,
      metadata: { vehicleId: input.vehicleId, type: input.type, cost: input.cost },
    });

    return { success: true, message: "Maintenance logged successfully", data: log };
  } catch (error) {
    console.error("Failed to log maintenance", error);
    return { success: false, message: "Failed to log maintenance job" };
  }
}

export async function resolveMaintenance(id: string, returnDate?: string) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_MAINTENANCE"])) {
      return { success: false, message: "You do not have permission to manage maintenance." };
    }
    const companyId = await requireCompanyId();
    await prisma.$transaction(async (tx) => {
      const current = await tx.maintenance.findFirst({ where: { id, companyId } });
      if (!current) throw new Error("Log not found");

      // Mark maintenance done
      await tx.maintenance.update({
        where: { id },
        data: {
          returnDate: returnDate ? new Date(returnDate) : new Date(),
        },
      });

      // Free up vehicle
      await tx.vehicle.update({
        where: { id: current.vehicleId },
        data: { status: "AVAILABLE" },
      });

    });

    revalidatePath("/maintenance");
    revalidatePath("/vehicles");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "RESOLVE_MAINTENANCE",
      entityType: "Maintenance",
      entityId: id,
      message: `${session.name} resolved maintenance log`,
    });

    return { success: true, message: "Maintenance resolved, vehicle is available" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to resolve maintenance" };
  }
}

export async function unresolveMaintenance(id: string) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_MAINTENANCE"])) {
      return { success: false, message: "You do not have permission to manage maintenance." };
    }
    const companyId = await requireCompanyId();
    await prisma.$transaction(async (tx) => {
      const current = await tx.maintenance.findFirst({ where: { id, companyId } });
      if (!current) throw new Error("Log not found");

      await tx.maintenance.update({
        where: { id },
        data: { returnDate: null },
      });

      await tx.vehicle.update({
        where: { id: current.vehicleId },
        data: { status: "MAINTENANCE" },
      });
    });

    revalidatePath("/maintenance");
    revalidatePath("/vehicles");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "UNRESOLVE_MAINTENANCE",
      entityType: "Maintenance",
      entityId: id,
      message: `${session.name} reopened maintenance log`,
    });

    return { success: true, message: "Maintenance reverted to globally ACTIVE" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to unresolve maintenance" };
  }
}

export async function deleteMaintenance(id: string) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_MAINTENANCE"])) {
      return { success: false, message: "You do not have permission to manage maintenance." };
    }
    const companyId = await requireCompanyId();
    await prisma.$transaction(async (tx) => {
      const log = await tx.maintenance.findFirst({ where: { id, companyId } });
      if (!log) throw new Error("Log not found");

      await tx.maintenance.delete({ where: { id } });

      // If the log was actively holding the vehicle hostage, free it up.
      const today = getBusinessStartOfToday();
      const returnDate = log.returnDate ? new Date(log.returnDate) : null;
      returnDate?.setHours(0, 0, 0, 0);
      if (!returnDate || returnDate > today) {
        await tx.vehicle.update({
          where: { id: log.vehicleId },
          data: { status: "AVAILABLE" },
        });
      }
    });

    revalidatePath("/maintenance");
    revalidatePath("/vehicles");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "DELETE_MAINTENANCE",
      entityType: "Maintenance",
      entityId: id,
      message: `${session.name} deleted maintenance log`,
    });

    return { success: true, message: "Maintenance log permanently deleted" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete maintenance log" };
  }
}
