"use server";

import { prisma } from "@/lib/prisma";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";

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

    if (!vehicle && !expense && !booking && !invoiceBooking) return log;
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
