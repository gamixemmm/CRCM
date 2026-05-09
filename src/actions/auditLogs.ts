"use server";

import { prisma } from "@/lib/prisma";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { revalidatePath } from "next/cache";
import { logAuditAction } from "@/lib/audit";
import { getBusinessStartOfToday } from "@/lib/businessTime";
import type { Prisma } from "@/generated/prisma/client";

const undoableActions = new Set([
  "CREATE_BOOKING",
  "CREATE_INVOICE",
  "CREATE_EXPENSE",
  "CREATE_MAINTENANCE",
  "CREATE_BROKER",
  "CREATE_VEHICLE",
  "ADD_CASH_REGISTER_AMOUNT",
  "REMOVE_CASH_REGISTER_AMOUNT",
]);

async function resolveVehicleStatus(tx: Prisma.TransactionClient, companyId: string, vehicleId: string) {
  const today = getBusinessStartOfToday();
  const activeBookings = await tx.booking.count({
    where: {
      companyId,
      vehicleId,
      OR: [
        { status: { in: ["ACTIVE", "LATE"] } },
        {
          status: "CONFIRMED",
          startDate: { lte: today },
          endDate: { gte: today },
        },
      ],
    },
  });

  if (activeBookings > 0) return "RENTED";

  const activeMaintenance = await tx.maintenance.count({
    where: {
      companyId,
      vehicleId,
      serviceDate: { lte: today },
      OR: [{ returnDate: null }, { returnDate: { gt: today } }],
    },
  });

  return activeMaintenance > 0 ? "MAINTENANCE" : "AVAILABLE";
}

async function syncVehicleStatus(tx: Prisma.TransactionClient, companyId: string, vehicleId: string) {
  const status = await resolveVehicleStatus(tx, companyId, vehicleId);
  await tx.vehicle.update({ where: { id: vehicleId }, data: { status } });
}

function getMetadataNumber(metadata: Prisma.JsonValue | null, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = metadata[key as keyof typeof metadata];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getAuditLogs() {
  const session = await requireCompanyAdminAccess();
  if (session.role !== "Administrator") {
    throw new Error("Administrator access is required");
  }

  const logs = await prisma.auditLog.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const undoneLogIds = new Set(
    logs
      .filter((log) => log.action === "UNDO_ACTION" && log.entityType === "AuditLog" && log.entityId)
      .map((log) => log.entityId as string)
  );

  const maintenanceIds = Array.from(new Set(logs
    .filter((log) => log.entityType === "Maintenance" && log.entityId)
    .map((log) => log.entityId as string)));

  const maintenanceLogs = maintenanceIds.length > 0
    ? await prisma.maintenance.findMany({
        where: {
          companyId: session.companyId,
          id: { in: maintenanceIds },
        },
        select: {
          id: true,
          vehicleId: true,
        },
      })
    : [];
  const vehicleIdByMaintenanceId = new Map(maintenanceLogs.map((log) => [log.id, log.vehicleId]));

  const expenseIds = Array.from(new Set(logs
    .filter((log) => log.entityType === "Expense" && log.entityId)
    .map((log) => log.entityId as string)));

  const expenses = expenseIds.length > 0
    ? await prisma.expense.findMany({
        where: {
          companyId: session.companyId,
          id: { in: expenseIds },
        },
        select: {
          id: true,
          category: true,
          amount: true,
          description: true,
          vehicleId: true,
        },
      })
    : [];
  const expenseById = new Map(expenses.map((expense) => [expense.id, expense]));

  const bookingIds = Array.from(new Set(logs
    .filter((log) => log.entityType === "Booking" && log.entityId)
    .map((log) => log.entityId as string)));

  const bookings = bookingIds.length > 0
    ? await prisma.booking.findMany({
        where: {
          companyId: session.companyId,
          id: { in: bookingIds },
        },
        select: {
          id: true,
          vehicleId: true,
          driverFirstName: true,
          driverLastName: true,
          totalAmount: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      })
    : [];
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));

  const invoiceIds = Array.from(new Set(logs
    .filter((log) => log.entityType === "Invoice" && log.entityId)
    .map((log) => log.entityId as string)));

  const invoices = invoiceIds.length > 0
    ? await prisma.invoice.findMany({
        where: {
          companyId: session.companyId,
          id: { in: invoiceIds },
        },
        select: {
          id: true,
          booking: {
            select: {
              id: true,
              vehicleId: true,
              driverFirstName: true,
              driverLastName: true,
              totalAmount: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      })
    : [];
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

  const vehicleIds = Array.from(new Set(logs.flatMap((log) => {
    const metadata = log.metadata as Record<string, unknown> | null;
    const expense = log.entityType === "Expense" && log.entityId ? expenseById.get(log.entityId) : null;
    const booking = log.entityType === "Booking" && log.entityId ? bookingById.get(log.entityId) : null;
    const invoice = log.entityType === "Invoice" && log.entityId ? invoiceById.get(log.entityId) : null;
    const metadataVehicleId = typeof metadata?.vehicleId === "string" ? metadata.vehicleId : null;
    const entityVehicleId = log.entityType === "Vehicle" && log.entityId ? log.entityId : null;
    const maintenanceVehicleId = log.entityType === "Maintenance" && log.entityId
      ? vehicleIdByMaintenanceId.get(log.entityId)
      : null;
    return [metadataVehicleId, entityVehicleId, maintenanceVehicleId, expense?.vehicleId, booking?.vehicleId, invoice?.booking.vehicleId].filter((id): id is string => Boolean(id));
  })));

  const vehicles = vehicleIds.length > 0
    ? await prisma.vehicle.findMany({
        where: {
          companyId: session.companyId,
          id: { in: vehicleIds },
        },
        select: {
          id: true,
          brand: true,
          model: true,
          plateNumber: true,
        },
      })
    : [];
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  return logs.map((log) => {
    const undoFields = {
      canUndo: undoableActions.has(log.action) && !undoneLogIds.has(log.id),
      undoDone: undoneLogIds.has(log.id),
    };
    const metadata = (log.metadata as Record<string, unknown> | null) || {};
    const expense = log.entityType === "Expense" && log.entityId ? expenseById.get(log.entityId) : null;
    const booking = log.entityType === "Booking" && log.entityId ? bookingById.get(log.entityId) : null;
    const invoice = log.entityType === "Invoice" && log.entityId ? invoiceById.get(log.entityId) : null;
    const invoiceBooking = invoice?.booking;
    let vehicleId: string | null | undefined = null;

    if (typeof metadata.vehicleId === "string") {
      vehicleId = metadata.vehicleId;
    } else if (log.entityType === "Vehicle") {
      vehicleId = log.entityId;
    } else if (log.entityType === "Maintenance" && log.entityId) {
      vehicleId = vehicleIdByMaintenanceId.get(log.entityId);
    } else if (expense?.vehicleId) {
      vehicleId = expense.vehicleId;
    } else if (booking?.vehicleId) {
      vehicleId = booking.vehicleId;
    } else if (invoiceBooking?.vehicleId) {
      vehicleId = invoiceBooking.vehicleId;
    }

    const vehicle = vehicleId ? vehicleById.get(vehicleId) : null;

    if (!vehicle && !expense && !booking && !invoiceBooking) {
      return {
        ...log,
        ...undoFields,
      };
    }
    const bookingDriverName = booking
      ? [booking.driverFirstName || booking.customer.firstName, booking.driverLastName || booking.customer.lastName]
          .filter(Boolean)
          .join(" ")
      : null;
    const invoiceDriverName = invoiceBooking
      ? [invoiceBooking.driverFirstName || invoiceBooking.customer.firstName, invoiceBooking.driverLastName || invoiceBooking.customer.lastName]
          .filter(Boolean)
          .join(" ")
      : null;

    return {
      ...log,
      ...undoFields,
      metadata: {
        ...metadata,
        ...(vehicle ? {
          vehicleId: vehicle.id,
          vehicleBrand: vehicle.brand,
          vehicleModel: vehicle.model,
          vehiclePlate: vehicle.plateNumber,
        } : {}),
        ...(expense ? {
          expenseCategory: expense.category,
          expenseAmount: expense.amount,
          expenseDescription: expense.description,
        } : {}),
        ...(booking ? {
          bookingDriverName,
          bookingTotalAmount: booking.totalAmount,
        } : {}),
        ...(invoiceBooking ? {
          invoiceBookingId: invoiceBooking.id,
          invoiceDriverName,
          invoiceBookingTotalAmount: invoiceBooking.totalAmount,
        } : {}),
      },
    };
  });
}

export async function undoAuditLogAction(logId: string) {
  try {
    const session = await requireCompanyAdminAccess();
    if (session.role !== "Administrator") {
      return { success: false, message: "Administrator access is required." };
    }

    const companyId = session.companyId;
    const log = await prisma.auditLog.findFirst({ where: { id: logId, companyId } });
    if (!log) return { success: false, message: "Log entry not found." };
    if (!undoableActions.has(log.action)) {
      return { success: false, message: "This action cannot be undone from logs." };
    }

    const existingUndo = await prisma.auditLog.findFirst({
      where: {
        companyId,
        action: "UNDO_ACTION",
        entityType: "AuditLog",
        entityId: log.id,
      },
    });
    if (existingUndo) return { success: false, message: "This action was already undone." };

    const entityId = log.entityId;
    if (!entityId && log.entityType !== "GlobalSettings") {
      return { success: false, message: "This log entry does not reference an item to undo." };
    }

    await prisma.$transaction(async (tx) => {
      if (log.action === "CREATE_BOOKING" && entityId) {
        const booking = await tx.booking.findFirst({
          where: { id: entityId, companyId },
          include: { invoice: true },
        });
        if (!booking) throw new Error("Booking already no longer exists.");
        if (booking.invoice) await tx.invoice.delete({ where: { id: booking.invoice.id } });
        await tx.booking.delete({ where: { id: booking.id } });
        await syncVehicleStatus(tx, companyId, booking.vehicleId);
        return;
      }

      if (log.action === "CREATE_INVOICE" && entityId) {
        const invoice = await tx.invoice.findFirst({ where: { id: entityId, companyId } });
        if (!invoice) throw new Error("Invoice already no longer exists.");
        await tx.invoice.delete({ where: { id: invoice.id } });
        return;
      }

      if (log.action === "CREATE_EXPENSE" && entityId) {
        const expense = await tx.expense.findFirst({ where: { id: entityId, companyId } });
        if (!expense) throw new Error("Expense already no longer exists.");
        await tx.expense.delete({ where: { id: expense.id } });
        return;
      }

      if (log.action === "CREATE_MAINTENANCE" && entityId) {
        const maintenance = await tx.maintenance.findFirst({ where: { id: entityId, companyId } });
        if (!maintenance) throw new Error("Maintenance log already no longer exists.");
        const generatedExpense = maintenance.cost > 0
          ? await tx.expense.findFirst({
              where: {
                companyId,
                vehicleId: maintenance.vehicleId,
                amount: maintenance.cost,
                category: "Maintenance",
                description: { startsWith: `Maintenance (${maintenance.type}):` },
              },
              orderBy: { createdAt: "desc" },
            })
          : null;
        if (generatedExpense) await tx.expense.delete({ where: { id: generatedExpense.id } });
        await tx.maintenance.delete({ where: { id: maintenance.id } });
        await syncVehicleStatus(tx, companyId, maintenance.vehicleId);
        return;
      }

      if (log.action === "CREATE_BROKER" && entityId) {
        const customer = await tx.customer.findFirst({
          where: { id: entityId, companyId },
          include: { _count: { select: { bookings: true } } },
        });
        if (!customer) throw new Error("Broker already no longer exists.");
        if (customer._count.bookings > 0) throw new Error("Cannot undo this broker because it has bookings.");
        await tx.customer.delete({ where: { id: customer.id } });
        return;
      }

      if (log.action === "CREATE_VEHICLE" && entityId) {
        const vehicle = await tx.vehicle.findFirst({
          where: { id: entityId, companyId },
          include: {
            _count: {
              select: {
                bookings: true,
                maintenance: true,
                expenses: true,
                technicalInspections: true,
                vignettePayments: true,
                insurancePayments: true,
              },
            },
          },
        });
        if (!vehicle) throw new Error("Vehicle already no longer exists.");
        const relatedCount = Object.values(vehicle._count).reduce((sum, count) => sum + count, 0);
        if (relatedCount > 0) throw new Error("Cannot undo this vehicle because it has related records.");
        await tx.vehicle.delete({ where: { id: vehicle.id } });
        return;
      }

      if (log.action === "ADD_CASH_REGISTER_AMOUNT" || log.action === "REMOVE_CASH_REGISTER_AMOUNT") {
        const amount = getMetadataNumber(log.metadata, "amount");
        if (amount === null || amount === 0) throw new Error("Cash adjustment amount is missing.");
        const undoAmount = log.action === "ADD_CASH_REGISTER_AMOUNT" ? -Math.abs(amount) : Math.abs(amount);
        await tx.globalSettings.upsert({
          where: { companyId },
          update: { cashRegister: { increment: undoAmount } },
          create: { id: `global:${companyId}`, companyId, cashRegister: undoAmount },
        });
        return;
      }

      throw new Error("This action cannot be undone from logs.");
    });

    await logAuditAction({
      actor: session,
      action: "UNDO_ACTION",
      entityType: "AuditLog",
      entityId: log.id,
      message: `${session.name} undid ${log.action}`,
      metadata: { originalLogId: log.id, originalAction: log.action, originalEntityType: log.entityType, originalEntityId: log.entityId },
    });

    revalidatePath("/logs");
    revalidatePath("/");
    revalidatePath("/bookings");
    revalidatePath("/vehicles");
    revalidatePath("/invoices");
    revalidatePath("/expenses");
    revalidatePath("/maintenance");
    revalidatePath("/customers");

    return { success: true, message: "Action undone successfully." };
  } catch (error) {
    console.error("Failed to undo audit log action", error);
    return { success: false, message: error instanceof Error ? error.message : "Failed to undo action." };
  }
}
