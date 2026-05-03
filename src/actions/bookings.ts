"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/company";
import { canPerform } from "@/lib/permissions";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { logAuditAction } from "@/lib/audit";
import { getBusinessStartOfToday, getBusinessStartOfTomorrow, getBusinessWeekStart, getRentalDays, zonedDateTimeToUtc } from "@/lib/businessTime";

interface BookingInput {
  customerId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  pickupLocation?: string;
  returnLocation?: string;
  status?: string;
  totalAmount: number;
  depositAmount?: number;
  pricePerDay?: number;
  clientType?: string;
  companyName?: string;
  companyICE?: string;
  paymentMethod?: string;
  driverFirstName?: string;
  driverLastName?: string;
  driverCIN?: string;
  driverLicense?: string;
  driver2FirstName?: string;
  driver2LastName?: string;
  driver2CIN?: string;
  driver2License?: string;
  notes?: string;
}

interface BookingDriverInput {
  driverFirstName?: string;
  driverLastName?: string;
  driverCIN?: string;
  driverLicense?: string;
  driver2FirstName?: string;
  driver2LastName?: string;
  driver2CIN?: string;
  driver2License?: string;
}

const RENTAL_HOLD_STATUSES = ["CONFIRMED", "ACTIVE", "LATE"];

function startOfToday() {
  return getBusinessStartOfToday();
}

function formatDateNote(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseBusinessDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return zonedDateTimeToUtc(year, month - 1, day);
}

async function syncLateBookings(companyId: string) {
  const today = startOfToday();
  const overdueBookings = await prisma.booking.findMany({
    where: {
      companyId,
      status: { in: RENTAL_HOLD_STATUSES },
      endDate: { lt: today },
    },
    include: { vehicle: true, invoice: true },
  });

  if (overdueBookings.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const booking of overdueBookings) {
      const previousReturnDate = new Date(booking.endDate);
      const startDate = new Date(booking.startDate);
      const newDays = getRentalDays(startDate, today);
      const rate = booking.pricePerDay ?? booking.vehicle.dailyRate;
      const newTotal = newDays * rate;
      const hasOriginalReturnNote = /\[Late\] Original return date: \d{4}-\d{2}-\d{2}\./.test(booking.notes || "");
      const lateNote = `[Late] Original return date: ${formatDateNote(previousReturnDate)}.`;
      const notes = hasOriginalReturnNote
        ? booking.notes
        : [booking.notes, lateNote].filter(Boolean).join("\n");

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "LATE",
          endDate: today,
          totalAmount: newTotal,
          notes,
        },
      });

      if (booking.invoice) {
        const deposit = booking.invoice.depositPaid ?? 0;
        const newAmountDue = Math.max(0, newTotal - deposit);
        await tx.invoice.update({
          where: { id: booking.invoice.id },
          data: {
            subtotal: newTotal,
            totalAmount: newTotal,
            amountDue: newAmountDue,
            paymentStatus: newAmountDue === 0 && newTotal > 0 ? "PAID" : deposit > 0 ? "PARTIAL" : "PENDING",
          },
        });
      }

      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: "RENTED" },
      });
    }
  });
}

export async function getBookings(params?: { status?: string; search?: string }) {
  const companyId = await requireCompanyId();
  await syncLateBookings(companyId);
  const where: Record<string, unknown> = {};
  where.companyId = companyId;
  
  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }
  
  if (params?.search) {
    where.OR = [
      { customer: { firstName: { contains: params.search, mode: "insensitive" } } },
      { customer: { lastName: { contains: params.search, mode: "insensitive" } } },
      { vehicle: { plateNumber: { contains: params.search, mode: "insensitive" } } },
      { companyName: { contains: params.search, mode: "insensitive" } },
    ];
  }

  return prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      vehicle: true,
      invoice: true,
    },
  });
}

export async function getBooking(id: string) {
  const companyId = await requireCompanyId();
  await syncLateBookings(companyId);
  return prisma.booking.findFirst({
    where: { id, companyId },
    include: {
      customer: true,
      vehicle: true,
      invoice: true,
    },
  });
}

export async function getBookingsPdfExportData() {
  const session = await requireCompanyAdminAccess();
  if (!canPerform(session, ["VIEW_BOOKINGS"])) {
    return { success: false, message: "You do not have permission to view bookings." };
  }

  const companyId = await requireCompanyId();
  await syncLateBookings(companyId);
  const today = getBusinessStartOfToday();
  const tomorrow = getBusinessStartOfTomorrow();
  const weekStart = getBusinessWeekStart();

  const [company, activeBookings, availableVehicles, activeMaintenance, todayInvoices, weekInvoices] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    }),
    prisma.booking.findMany({
      where: { companyId, status: { in: ["ACTIVE", "LATE"] } },
      orderBy: { startDate: "asc" },
      include: {
        customer: true,
        vehicle: true,
        invoice: true,
      },
    }),
    prisma.vehicle.findMany({
      where: {
        companyId,
        status: "AVAILABLE",
        bookings: {
          none: {
            status: { in: ["ACTIVE", "LATE"] },
          },
        },
        maintenance: {
          none: {
            serviceDate: { lte: today },
            OR: [
              { returnDate: null },
              { returnDate: { gt: today } },
            ],
          },
        },
      },
      orderBy: [{ brand: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
    }),
    prisma.maintenance.findMany({
      where: {
        companyId,
        serviceDate: { lte: today },
        OR: [
          { returnDate: null },
          { returnDate: { gt: today } },
        ],
      },
      orderBy: { serviceDate: "asc" },
      include: { vehicle: true },
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        createdAt: { gte: today, lt: tomorrow },
      },
      orderBy: { createdAt: "desc" },
      include: { booking: { include: { customer: true, vehicle: true } } },
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        createdAt: { gte: weekStart, lt: tomorrow },
      },
      orderBy: { createdAt: "desc" },
      include: { booking: { include: { customer: true, vehicle: true } } },
    }),
  ]);

  return {
    success: true,
    data: {
      companyName: company?.name || session.companyName || "Company",
      activeBookings: JSON.parse(JSON.stringify(activeBookings)),
      availableVehicles: JSON.parse(JSON.stringify(availableVehicles)),
      activeMaintenance: JSON.parse(JSON.stringify(activeMaintenance)),
      todayInvoices: JSON.parse(JSON.stringify(todayInvoices)),
      weekInvoices: JSON.parse(JSON.stringify(weekInvoices)),
    },
  };
}

export async function createBooking(input: BookingInput) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["ADD_BOOKINGS"])) {
      return { success: false, message: "You do not have permission to create bookings." };
    }
    const companyId = await requireCompanyId();
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const status = ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(input.status || "")
      ? input.status!
      : "CONFIRMED";

    if (end <= start) {
      return { success: false, message: "End date must be after start date" };
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: input.vehicleId, companyId },
    });

    if (!vehicle) {
      return { success: false, message: "Vehicle not found" };
    }

    if (vehicle.status !== "AVAILABLE") {
      return { success: false, message: "Vehicle is not available for booking." };
    }

    // Check overlaps
    const overlaps = await prisma.booking.count({
      where: {
        companyId,
        vehicleId: input.vehicleId,
        status: { in: RENTAL_HOLD_STATUSES },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (overlaps > 0) {
      return { success: false, message: "Vehicle is already booked for these dates." };
    }

    const maintenanceOverlap = await prisma.maintenance.count({
      where: {
        companyId,
        vehicleId: input.vehicleId,
        serviceDate: { lte: end },
        OR: [
          { returnDate: null },
          { returnDate: { gte: start } },
        ],
      },
    });

    if (maintenanceOverlap > 0) {
      return { success: false, message: "Vehicle is in maintenance for these dates." };
    }

    const booking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          customerId: input.customerId,
          vehicleId: input.vehicleId,
          companyId,
          startDate: start,
          endDate: end,
          pickupLocation: input.pickupLocation || null,
          returnLocation: input.returnLocation || null,
          status,
          totalAmount: input.totalAmount,
          depositAmount: input.depositAmount || 0,
          pricePerDay: input.pricePerDay || null,
          clientType: input.clientType || "PARTICULIER",
          companyName: input.companyName || null,
          companyICE: input.companyICE || null,
          paymentMethod: input.paymentMethod || "ESPECE",
          driverFirstName: input.driverFirstName || null,
          driverLastName: input.driverLastName || null,
          driverCIN: input.driverCIN || null,
          driverLicense: input.driverLicense || null,
          driver2FirstName: input.driver2FirstName || null,
          driver2LastName: input.driver2LastName || null,
          driver2CIN: input.driver2CIN || null,
          driver2License: input.driver2License || null,
          notes: input.notes || null,
        },
      });



      // Auto-generate corresponding invoice
      const deposit = input.depositAmount || 0;
      const amountDue = Math.max(0, input.totalAmount - deposit);
      let paymentStatus = "PENDING";
      if (amountDue === 0 && input.totalAmount > 0) paymentStatus = "PAID";
      else if (deposit > 0) paymentStatus = "PARTIAL";

      let notesStr = "[Auto-generated]";
      if (deposit > 0) {
        notesStr += ` Initial deposit of ${deposit} recorded via ${input.paymentMethod || "ESPECE"}.`;
      }

      await tx.invoice.create({
        data: {
          bookingId: b.id,
          companyId,
          subtotal: input.totalAmount,
          totalAmount: input.totalAmount,
          depositPaid: deposit,
          amountDue: amountDue,
          paymentStatus: paymentStatus,
          notes: notesStr,
        }
      });

      if (status === "ACTIVE" || status === "LATE") {
        await tx.vehicle.update({
          where: { id: input.vehicleId },
          data: { status: "RENTED" },
        });
      }

      return b;
    });

    revalidatePath("/bookings");
    revalidatePath("/vehicles");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "CREATE_BOOKING",
      entityType: "Booking",
      entityId: booking.id,
      message: `${session.name} created booking ${booking.id}`,
      metadata: { vehicleId: input.vehicleId, customerId: input.customerId, totalAmount: input.totalAmount },
    });

    return { success: true, message: "Booking created", data: booking };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create booking" };
  }
}

// ─── Update Booking Status ───────────────────────────────────────
export async function updateBookingStatus(bookingId: string, newStatus: string) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_BOOKINGS"])) {
      return { success: false, message: "You do not have permission to manage bookings." };
    }
    const companyId = await requireCompanyId();
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: { vehicle: true },
    });

    if (!booking) {
      return { success: false, message: "Booking not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: newStatus },
      });

      // Sync vehicle status based on the booking transition
      if (newStatus === "ACTIVE" || newStatus === "LATE") {
        await tx.vehicle.update({
          where: { id: booking.vehicleId },
          data: { status: "RENTED" },
        });
      } else if (newStatus === "COMPLETED" || newStatus === "CANCELLED") {
        // Check if the vehicle has any OTHER active bookings before freeing it
        const otherActive = await tx.booking.count({
          where: {
            companyId,
            vehicleId: booking.vehicleId,
            id: { not: bookingId },
            status: { in: ["ACTIVE", "LATE"] },
          },
        });
        if (otherActive === 0) {
          await tx.vehicle.update({
            where: { id: booking.vehicleId },
            data: { status: "AVAILABLE" },
          });
        }
      }
    });

    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/bookings");
    revalidatePath("/vehicles");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "UPDATE_BOOKING_STATUS",
      entityType: "Booking",
      entityId: bookingId,
      message: `${session.name} marked booking ${bookingId} as ${newStatus}`,
      metadata: { status: newStatus },
    });

    return { success: true, message: `Booking marked as ${newStatus}` };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update booking status" };
  }
}

// ─── Early Pickup ────────────────────────────────────────────────
export async function handleEarlyPickup(bookingId: string, updateDate: boolean) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_BOOKINGS"])) {
      return { success: false, message: "You do not have permission to manage bookings." };
    }
    const companyId = await requireCompanyId();
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: { vehicle: true, invoice: true },
    });

    if (!booking) {
      return { success: false, message: "Booking not found" };
    }

    if (booking.status !== "CONFIRMED") {
      return { success: false, message: "Only confirmed bookings can be picked up" };
    }

    const today = getBusinessStartOfToday();
    const endDate = new Date(booking.endDate);

    // Check if the vehicle has any OTHER active/confirmed booking that overlaps with today → endDate
    const overlaps = await prisma.booking.count({
      where: {
        companyId,
        vehicleId: booking.vehicleId,
        id: { not: bookingId },
        status: { in: RENTAL_HOLD_STATUSES },
        startDate: { lte: endDate },
        endDate: { gte: today },
      },
    });

    if (overlaps > 0) {
      return { success: false, message: "Can't early pickup — vehicle is unavailable (conflicting booking)" };
    }

    await prisma.$transaction(async (tx) => {
      if (updateDate) {
        // Recalculate duration & amounts
        const newDays = getRentalDays(today, endDate);
        const rate = booking.pricePerDay ?? booking.vehicle.dailyRate;
        const newTotal = newDays * rate;

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            startDate: today,
            status: "ACTIVE",
            totalAmount: newTotal,
          },
        });

        // Update invoice if it exists
        if (booking.invoice) {
          const deposit = booking.invoice.depositPaid ?? 0;
          const newAmountDue = Math.max(0, newTotal - deposit);
          await tx.invoice.update({
            where: { id: booking.invoice.id },
            data: {
              subtotal: newTotal,
              totalAmount: newTotal,
              amountDue: newAmountDue,
              paymentStatus: newAmountDue === 0 && newTotal > 0 ? "PAID" : deposit > 0 ? "PARTIAL" : "PENDING",
            },
          });
        }
      } else {
        // Just mark as active without changing dates
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: "ACTIVE" },
        });
      }

      // Set vehicle to RENTED
      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: "RENTED" },
      });
    });

    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/bookings");
    revalidatePath("/vehicles");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "EARLY_PICKUP",
      entityType: "Booking",
      entityId: bookingId,
      message: `${session.name} processed early pickup for booking ${bookingId}`,
      metadata: { updateDate },
    });

    return { success: true, message: updateDate ? "Early pickup — date & invoice updated" : "Picked up early (dates unchanged)" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to process early pickup" };
  }
}

// ─── Return Vehicle ──────────────────────────────────────────────
export async function handleReturn(bookingId: string, updateDate: boolean, newMileage: number) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_BOOKINGS"])) {
      return { success: false, message: "You do not have permission to manage bookings." };
    }
    const companyId = await requireCompanyId();
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: { vehicle: true, invoice: true },
    });

    if (!booking) {
      return { success: false, message: "Booking not found" };
    }

    if (booking.status !== "ACTIVE" && booking.status !== "LATE") {
      return { success: false, message: "Only active or late bookings can be returned" };
    }

    const today = getBusinessStartOfToday();
    const startDate = new Date(booking.startDate);

    await prisma.$transaction(async (tx) => {
      if (updateDate) {
        // Recalculate duration & amounts based on actual usage (startDate → today)
        const newDays = getRentalDays(startDate, today);
        const rate = booking.pricePerDay ?? booking.vehicle.dailyRate;
        const newTotal = newDays * rate;

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            endDate: today,
            status: "COMPLETED",
            totalAmount: newTotal,
          },
        });

        // Update invoice if it exists
        if (booking.invoice) {
          const deposit = booking.invoice.depositPaid ?? 0;
          const newAmountDue = Math.max(0, newTotal - deposit);
          await tx.invoice.update({
            where: { id: booking.invoice.id },
            data: {
              subtotal: newTotal,
              totalAmount: newTotal,
              amountDue: newAmountDue,
              paymentStatus: newAmountDue === 0 && newTotal > 0 ? "PAID" : deposit > 0 ? "PARTIAL" : "PENDING",
            },
          });
        }
      } else {
        // Just mark as completed without changing dates
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: "COMPLETED" },
        });
      }

      // Update vehicle mileage and free it up
      const otherActive = await tx.booking.count({
        where: {
          companyId,
          vehicleId: booking.vehicleId,
          id: { not: bookingId },
          status: { in: ["ACTIVE", "LATE"] },
        },
      });

      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: {
          mileage: newMileage,
          ...(otherActive === 0 ? { status: "AVAILABLE" } : {}),
        },
      });
    });

    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/bookings");
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${booking.vehicleId}`);
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "RETURN_BOOKING",
      entityType: "Booking",
      entityId: bookingId,
      message: `${session.name} returned booking ${bookingId}`,
      metadata: { updateDate, newMileage },
    });

    return { success: true, message: updateDate ? "Vehicle returned — date & invoice updated to today" : "Vehicle returned successfully" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to process return" };
  }
}

// ─── Update Booking Dates ────────────────────────────────────────
export async function updateBookingDates(bookingId: string, newStartDate: string, newEndDate: string, newPricePerDay?: number) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_BOOKINGS"])) {
      return { success: false, message: "You do not have permission to manage bookings." };
    }
    const companyId = await requireCompanyId();
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: { vehicle: true, invoice: true },
    });

    if (!booking) {
      return { success: false, message: "Booking not found" };
    }

    const newStart = parseBusinessDateInput(newStartDate);
    const newEnd = parseBusinessDateInput(newEndDate);

    if (newEnd <= newStart) {
      return { success: false, message: "Return date must be after pickup date" };
    }

    // Check for overlapping bookings with the new dates (excluding this booking)
    const overlaps = await prisma.booking.count({
      where: {
        companyId,
        vehicleId: booking.vehicleId,
        id: { not: bookingId },
        status: { in: RENTAL_HOLD_STATUSES },
        startDate: { lte: newEnd },
        endDate: { gte: newStart },
      },
    });

    if (overlaps > 0) {
      return { success: false, message: "Vehicle has a conflicting booking for these dates" };
    }

    const maintenanceOverlap = await prisma.maintenance.count({
      where: {
        companyId,
        vehicleId: booking.vehicleId,
        serviceDate: { lte: newEnd },
        OR: [
          { returnDate: null },
          { returnDate: { gte: newStart } },
        ],
      },
    });

    if (maintenanceOverlap > 0) {
      return { success: false, message: "Vehicle is in maintenance for these dates." };
    }

    // Calculate new duration and total
    const newDays = getRentalDays(newStart, newEnd);
    const rate = newPricePerDay ?? booking.pricePerDay ?? booking.vehicle.dailyRate;
    const newTotal = newDays * rate;

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          startDate: newStart,
          endDate: newEnd,
          totalAmount: newTotal,
          ...(newPricePerDay !== undefined ? { pricePerDay: newPricePerDay } : {}),
        },
      });

      // Update invoice if it exists
      if (booking.invoice) {
        const deposit = booking.invoice.depositPaid ?? 0;
        const newAmountDue = Math.max(0, newTotal - deposit);
        await tx.invoice.update({
          where: { id: booking.invoice.id },
          data: {
            subtotal: newTotal,
            totalAmount: newTotal,
            amountDue: newAmountDue,
            paymentStatus: newAmountDue === 0 && newTotal > 0 ? "PAID" : deposit > 0 ? "PARTIAL" : "PENDING",
          },
        });
      }
    });

    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/bookings");
    revalidatePath("/vehicles");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "UPDATE_BOOKING_DATES",
      entityType: "Booking",
      entityId: bookingId,
      message: `${session.name} updated booking dates for ${bookingId}`,
      metadata: { newStartDate, newEndDate, newPricePerDay, totalAmount: newTotal },
    });

    return { success: true, message: `Dates updated — ${newDays} days, total recalculated` };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update booking dates" };
  }
}

export async function updateBookingDrivers(bookingId: string, input: BookingDriverInput) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_BOOKINGS"])) {
      return { success: false, message: "You do not have permission to manage bookings." };
    }

    const companyId = await requireCompanyId();
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      select: { id: true },
    });

    if (!booking) {
      return { success: false, message: "Booking not found" };
    }

    const clean = (value?: string) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        driverFirstName: clean(input.driverFirstName),
        driverLastName: clean(input.driverLastName),
        driverCIN: clean(input.driverCIN),
        driverLicense: clean(input.driverLicense),
        driver2FirstName: clean(input.driver2FirstName),
        driver2LastName: clean(input.driver2LastName),
        driver2CIN: clean(input.driver2CIN),
        driver2License: clean(input.driver2License),
      },
    });

    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/bookings");
    await logAuditAction({
      actor: session,
      action: "UPDATE_BOOKING_DRIVERS",
      entityType: "Booking",
      entityId: bookingId,
      message: `${session.name} updated drivers for booking ${bookingId}`,
      metadata: { ...input },
    });

    return { success: true, message: "Driver information updated" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update driver information" };
  }
}
