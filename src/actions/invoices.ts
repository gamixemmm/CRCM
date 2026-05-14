"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/company";
import { canPerform } from "@/lib/permissions";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { logAuditAction } from "@/lib/audit";
import { addBusinessCalendarDays } from "@/lib/businessTime";

interface InvoiceInput {
  bookingId: string;
  subtotal: number;
  extraCharges?: number;
  extraChargeDesc?: string;
  discount?: number;
  depositPaid?: number;
  notes?: string;
}

interface PaymentOptions {
  extendBooking?: boolean;
}

const RENTAL_HOLD_STATUSES = ["CONFIRMED", "ACTIVE", "LATE"];

export async function getInvoices(params?: { status?: string; search?: string }) {
  const companyId = await requireCompanyId();
  const where: Record<string, unknown> = {};
  where.companyId = companyId;

  if (params?.status === "UNPAID") {
    where.paymentStatus = { in: ["PENDING", "PARTIAL"] };
  } else if (params?.status && params.status !== "ALL") {
    where.paymentStatus = params.status;
  }

  if (params?.search) {
    where.OR = [
      { id: { contains: params.search, mode: "insensitive" } },
      { booking: { customer: { firstName: { contains: params.search, mode: "insensitive" } } } },
      { booking: { customer: { lastName: { contains: params.search, mode: "insensitive" } } } },
    ];
  }

  return prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      booking: {
        include: {
          customer: true,
          vehicle: true,
        },
      },
    },
  });
}

export async function getInvoice(id: string) {
  const companyId = await requireCompanyId();
  return prisma.invoice.findFirst({
    where: { id, companyId },
    include: {
      booking: {
        include: {
          customer: true,
          vehicle: true,
        },
      },
    },
  });
}

export async function createInvoice(input: InvoiceInput) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_INVOICES"])) {
      return { success: false, message: "You do not have permission to manage invoices." };
    }
    const companyId = await requireCompanyId();
    const existing = await prisma.invoice.findFirst({
      where: { bookingId: input.bookingId, companyId },
    });

    if (existing) {
      return { success: false, message: "An invoice already exists for this booking." };
    }

    const totalAmount = input.subtotal + (input.extraCharges || 0) - (input.discount || 0);
    const amountDue = totalAmount - (input.depositPaid || 0);
    
    // Automatically set as paid if amount due is 0 or less
    const paymentStatus = amountDue <= 0 ? "PAID" : "PENDING";
    const paidAt = paymentStatus === "PAID" ? new Date() : null;

    const invoice = await prisma.invoice.create({
      data: {
        bookingId: input.bookingId,
        companyId,
        subtotal: input.subtotal,
        extraCharges: input.extraCharges || 0,
        extraChargeDesc: input.extraChargeDesc || null,
        discount: input.discount || 0,
        totalAmount,
        depositPaid: input.depositPaid || 0,
        amountDue,
        paymentStatus,
        paidAt,
        notes: input.notes || null,
      },
    });

    revalidatePath("/invoices");
    revalidatePath(`/bookings/${input.bookingId}`);
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "CREATE_INVOICE",
      entityType: "Invoice",
      entityId: invoice.id,
      message: `${session.name} created invoice for booking ${input.bookingId}`,
      metadata: { bookingId: input.bookingId, totalAmount: invoice.totalAmount },
    });

    return { success: true, message: "Invoice generated successfully", data: invoice };
  } catch (error) {
    console.error("Failed to create invoice", error);
    return { success: false, message: "Failed to create invoice" };
  }
}

export async function updatePaymentStatus(
  id: string,
  status: "PENDING" | "PAID" | "PARTIAL",
  amountPaid: number = 0,
  markBookingCompleted = false,
  paymentMethod?: string,
  options: PaymentOptions = {}
) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["PAY_INVOICES"])) {
      return { success: false, message: "You do not have permission to pay invoices." };
    }
    const companyId = await requireCompanyId();
    const invoice = await prisma.$transaction(async (tx) => {
      const current = await tx.invoice.findFirst({
        where: { id, companyId },
        include: { booking: { include: { vehicle: true } } },
      });
      if (!current) throw new Error("Not found");
      
      let newAmountDue = current.amountDue;
      let extensionDays = 0;
      let extensionCharge = 0;

      if (status === "PAID") {
        newAmountDue = current.amountDue - amountPaid;
      } else if (status === "PARTIAL") {
        newAmountDue = current.amountDue - amountPaid;
        if (newAmountDue <= 0) {
          status = "PAID";
        }
      } else if (status === "PENDING") {
        newAmountDue = current.totalAmount - current.depositPaid;
      }

      if (status !== "PENDING" && options.extendBooking && newAmountDue < 0) {
        const dailyRate = current.booking.pricePerDay ?? current.booking.vehicle.dailyRate;
        if (dailyRate > 0) {
          extensionDays = Math.floor(Math.abs(newAmountDue) / dailyRate);
          if (extensionDays > 0) {
            const newEndDate = addBusinessCalendarDays(current.booking.endDate, extensionDays);
            const overlaps = await tx.booking.count({
              where: {
                companyId,
                vehicleId: current.booking.vehicleId,
                id: { not: current.bookingId },
                status: { in: RENTAL_HOLD_STATUSES },
                startDate: { lte: newEndDate },
                endDate: { gte: current.booking.endDate },
              },
            });

            if (overlaps > 0) {
              throw new Error("Vehicle has a conflicting booking during the paid extension.");
            }

            extensionCharge = extensionDays * dailyRate;
            newAmountDue += extensionCharge;

            await tx.booking.update({
              where: { id: current.bookingId },
              data: {
                endDate: newEndDate,
                totalAmount: current.booking.totalAmount + extensionCharge,
              },
            });
          }
        }
      }

      if (newAmountDue <= 0 && status !== "PENDING") {
        status = "PAID";
      }

      let notesToUpdate = current.notes;
      if (paymentMethod && status !== "PENDING") {
        const extensionNote = extensionDays > 0 ? ` Extended booking by ${extensionDays} day${extensionDays === 1 ? "" : "s"}.` : "";
        notesToUpdate = `${current.notes ? current.notes + '\n' : ''}[Payment: ${amountPaid} via ${paymentMethod}]${extensionNote}`;
      }

      const inv = await tx.invoice.update({
        where: { id },
        data: {
          paymentStatus: status,
          paidAt: status === "PAID" ? new Date() : (status === "PENDING" ? null : current.paidAt),
          amountDue: newAmountDue,
          ...(extensionCharge > 0 ? {
            subtotal: current.subtotal + extensionCharge,
            totalAmount: current.totalAmount + extensionCharge,
          } : {}),
          notes: notesToUpdate,
        },
      });

      if (paymentMethod) {
         await tx.booking.update({
           where: { id: current.bookingId },
           data: { paymentMethod }
         });
      }

      if (status === "PAID" && markBookingCompleted) {
        await tx.booking.update({
          where: { id: inv.bookingId },
          data: { status: "COMPLETED" },
        });

        const booking = await tx.booking.findFirst({ where: { id: inv.bookingId, companyId } });
        if (booking && booking.vehicleId) {
          await tx.vehicle.update({
            where: { id: booking.vehicleId },
            data: { status: "AVAILABLE" },
          });
        }
      }

      return inv;
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath(`/bookings/${invoice.bookingId}`);
    revalidatePath("/bookings");
    revalidatePath("/vehicles");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "UPDATE_INVOICE_PAYMENT",
      entityType: "Invoice",
      entityId: id,
      message: `${session.name} updated invoice payment to ${status}`,
      metadata: { status, amountPaid, paymentMethod, extendBooking: options.extendBooking },
    });

    return { success: true, message: `Invoice marked as ${status}` };
  } catch (error) {
    console.error("Failed to update status", error);
    return { success: false, message: error instanceof Error ? error.message : "Failed to update invoice status" };
  }
}

export async function deleteInvoice(id: string) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["DELETE_INVOICES"])) {
      return { success: false, message: "You do not have permission to delete invoices." };
    }
    const companyId = await requireCompanyId();
    const current = await prisma.invoice.findFirst({ where: { id, companyId } });
    if (!current) {
      return { success: false, message: "Invoice not found" };
    }
    const invoice = await prisma.invoice.delete({
      where: { id },
    });
    
    revalidatePath("/invoices");
    revalidatePath(`/bookings/${invoice.bookingId}`);
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "DELETE_INVOICE",
      entityType: "Invoice",
      entityId: id,
      message: `${session.name} deleted invoice ${id}`,
      metadata: { bookingId: invoice.bookingId },
    });

    return { success: true, message: "Invoice deleted successfully" };
  } catch (error) {
    console.error("Failed to delete invoice", error);
    return { success: false, message: "Failed to delete invoice" };
  }
}
