"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
  return prisma.maintenance.findUnique({
    where: { id },
    include: { vehicle: true },
  });
}

export async function getMaintenanceLogs(params?: { status?: string; search?: string }) {
  const where: any = {};

  if (params?.status && params.status !== "ALL") {
    // ACTIVE means returnDate is null, COMPLETED means returnDate exists
    if (params.status === "ACTIVE") where.returnDate = null;
    if (params.status === "COMPLETED") where.returnDate = { not: null };
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
    const current = await prisma.maintenance.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!current) return { success: false, message: "Maintenance log not found" };

    if (input.mileageAtService !== undefined && input.mileageAtService < current.vehicle.mileage) {
      return { success: false, message: "New mileage cannot be less than current mileage" };
    }

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

      if (input.mileageAtService !== undefined) {
        await tx.vehicle.update({
          where: { id: current.vehicleId },
          data: { mileage: input.mileageAtService },
        });
      }

      return log;
    });

    revalidatePath("/maintenance");
    revalidatePath(`/maintenance/${id}`);
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${current.vehicleId}`);

    return { success: true, message: "Maintenance updated successfully", data: updated };
  } catch (error) {
    console.error("Failed to update maintenance", error);
    return { success: false, message: "Failed to update maintenance" };
  }
}

export async function getMaintenanceServiceProviders() {
  const providers = await prisma.maintenance.findMany({
    where: {
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
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: input.vehicleId }
    });

    if (!vehicle) return { success: false, message: "Vehicle not found" };
    if (input.mileageAtService !== undefined && input.mileageAtService < vehicle.mileage) {
      return { success: false, message: "New mileage cannot be less than current mileage" };
    }

    const serviceDate = new Date(input.serviceDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isServiceToday = serviceDate <= today;

    const log = await prisma.$transaction(async (tx) => {
      // Create log
      const m = await tx.maintenance.create({
        data: {
          vehicleId: input.vehicleId,
          serviceDate,
          returnDate: input.returnDate ? new Date(input.returnDate) : null,
          description: input.description,
          cost: input.cost,
          serviceProvider: input.serviceProvider || null,
          notes: input.notes || null,
          type: input.type,
          partsUsed: input.partsUsed,
          mileageAtService: input.mileageAtService || vehicle.mileage,
        },
      });

      // Only change status to MAINTENANCE if the service is today or past
      // and the vehicle is not currently rented
      // and there's no return date (meaning it's still in maintenance)
      const vehicleUpdateData: { status?: string; mileage?: number } = {};

      if (input.mileageAtService !== undefined) {
        vehicleUpdateData.mileage = input.mileageAtService;
      }

      if (isServiceToday && vehicle.status !== "RENTED" && !input.returnDate) {
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

    return { success: true, message: "Maintenance logged successfully", data: log };
  } catch (error) {
    console.error("Failed to log maintenance", error);
    return { success: false, message: "Failed to log maintenance job" };
  }
}

export async function resolveMaintenance(id: string, returnDate?: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.maintenance.findUnique({ where: { id } });
      if (!current) throw new Error("Log not found");

      // Mark maintenance done
      const resolvedLog = await tx.maintenance.update({
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

      return resolvedLog;
    });

    revalidatePath("/maintenance");
    revalidatePath("/vehicles");
    revalidatePath("/");

    return { success: true, message: "Maintenance resolved, vehicle is available" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to resolve maintenance" };
  }
}

export async function unresolveMaintenance(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.maintenance.findUnique({ where: { id } });
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

    return { success: true, message: "Maintenance reverted to globally ACTIVE" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to unresolve maintenance" };
  }
}

export async function deleteMaintenance(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const log = await tx.maintenance.findUnique({ where: { id } });
      if (!log) throw new Error("Log not found");

      await tx.maintenance.delete({ where: { id } });

      // If the log was actively holding the vehicle hostage, free it up.
      if (!log.returnDate) {
        await tx.vehicle.update({
          where: { id: log.vehicleId },
          data: { status: "AVAILABLE" },
        });
      }
    });

    revalidatePath("/maintenance");
    revalidatePath("/vehicles");
    revalidatePath("/");

    return { success: true, message: "Maintenance log permanently deleted" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete maintenance log" };
  }
}
