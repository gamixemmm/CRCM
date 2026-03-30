"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
  notes?: string;
}

export async function getBookings(params?: { status?: string; search?: string }) {
  const where: any = {};
  
  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }
  
  if (params?.search) {
    where.OR = [
      { customer: { firstName: { contains: params.search, mode: "insensitive" } } },
      { customer: { lastName: { contains: params.search, mode: "insensitive" } } },
      { vehicle: { plateNumber: { contains: params.search, mode: "insensitive" } } },
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
  return prisma.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      invoice: true,
    },
  });
}

export async function createBooking(input: BookingInput) {
  try {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    if (end <= start) {
      return { success: false, message: "End date must be after start date" };
    }

    // Check overlaps
    const overlaps = await prisma.booking.count({
      where: {
        vehicleId: input.vehicleId,
        status: { in: ["CONFIRMED", "ACTIVE"] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (overlaps > 0) {
      return { success: false, message: "Vehicle is already booked for these dates." };
    }

    const booking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          customerId: input.customerId,
          vehicleId: input.vehicleId,
          startDate: start,
          endDate: end,
          pickupLocation: input.pickupLocation || null,
          returnLocation: input.returnLocation || null,
          status: input.status || "CONFIRMED",
          totalAmount: input.totalAmount,
          depositAmount: input.depositAmount || 0,
          notes: input.notes || null,
        },
      });

      // Update vehicle status instantly if the booking starts today
      const today = new Date();
      if (start.toDateString() === today.toDateString()) {
        await tx.vehicle.update({
          where: { id: input.vehicleId },
          data: { status: "RENTED" },
        });
        await tx.booking.update({
          where: { id: b.id },
          data: { status: "ACTIVE" },
        });
      }

      return b;
    });

    revalidatePath("/bookings");
    revalidatePath("/vehicles");
    revalidatePath("/");

    return { success: true, message: "Booking created", data: booking };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create booking" };
  }
}
