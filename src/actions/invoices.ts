"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface InvoiceInput {
  bookingId: string;
  subtotal: number;
  extraCharges?: number;
  extraChargeDesc?: string;
  discount?: number;
  depositPaid?: number;
  notes?: string;
}

export async function getInvoices(params?: { status?: string; search?: string }) {
  const where: any = {};

  if (params?.status && params.status !== "ALL") {
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
  return prisma.invoice.findUnique({
    where: { id },
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
    const existing = await prisma.invoice.findUnique({
      where: { bookingId: input.bookingId },
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

    return { success: true, message: "Invoice generated successfully", data: invoice };
  } catch (error) {
    console.error("Failed to create invoice", error);
    return { success: false, message: "Failed to create invoice" };
  }
}

export async function updatePaymentStatus(id: string, status: "PENDING" | "PAID" | "PARTIAL", amountPaid: number = 0, markBookingCompleted = false, paymentMethod?: string) {
  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const current = await tx.invoice.findUnique({ where: { id } });
      if (!current) throw new Error("Not found");
      
      let newAmountDue = current.amountDue;

      if (status === "PAID") {
        newAmountDue = 0;
      } else if (status === "PARTIAL") {
        newAmountDue = current.amountDue - amountPaid;
        if (newAmountDue <= 0) {
          newAmountDue = 0;
          status = "PAID";
        }
      } else if (status === "PENDING") {
        newAmountDue = current.totalAmount - current.depositPaid;
      }

      let notesToUpdate = current.notes;
      if (paymentMethod && status !== "PENDING") {
        notesToUpdate = `${current.notes ? current.notes + '\n' : ''}[Payment: ${amountPaid} via ${paymentMethod}]`;
      }

      const inv = await tx.invoice.update({
        where: { id },
        data: {
          paymentStatus: status,
          paidAt: status === "PAID" ? new Date() : (status === "PENDING" ? null : current.paidAt),
          amountDue: newAmountDue,
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

        const booking = await tx.booking.findUnique({ where: { id: inv.bookingId } });
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
    revalidatePath("/");

    return { success: true, message: `Invoice marked as ${status}` };
  } catch (error) {
    console.error("Failed to update status", error);
    return { success: false, message: "Failed to update invoice status" };
  }
}

export async function deleteInvoice(id: string) {
  try {
    const invoice = await prisma.invoice.delete({
      where: { id },
    });
    
    revalidatePath("/invoices");
    revalidatePath(`/bookings/${invoice.bookingId}`);
    revalidatePath("/");
    
    return { success: true, message: "Invoice deleted successfully" };
  } catch (error) {
    console.error("Failed to delete invoice", error);
    return { success: false, message: "Failed to delete invoice" };
  }
}
