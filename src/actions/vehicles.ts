"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────────
interface VehicleInput {
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color?: string;
  transmission?: string;
  fuelType?: string;
  dailyRate: number;
  mileage?: number;
  status?: string;
  imageUrl?: string;
  circulationDate?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  notes?: string;
}

interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: Record<string, string[]>;
}

// ─── Get All Vehicles ────────────────────────────────────────────
export async function getVehicles(params?: {
  status?: string;
  search?: string;
}) {
  const where: Record<string, unknown> = {};

  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params?.search) {
    where.OR = [
      { brand: { contains: params.search } },
      { model: { contains: params.search } },
      { plateNumber: { contains: params.search } },
    ];
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { bookings: true },
      },
    },
  });

  return vehicles;
}

// ─── Get Single Vehicle ──────────────────────────────────────────
export async function getVehicle(id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: { startDate: "desc" },
        take: 10,
        include: { customer: true },
      },
      maintenance: {
        orderBy: { serviceDate: "desc" },
        take: 10,
      },
    },
  });
}

// ─── Create Vehicle ──────────────────────────────────────────────
export async function createVehicle(input: VehicleInput): Promise<ActionResult> {
  try {
    // Validate required fields
    if (!input.brand || !input.model || !input.plateNumber || !input.dailyRate) {
      return {
        success: false,
        message: "Please fill in all required fields",
        errors: {
          ...((!input.brand) && { brand: ["Brand is required"] }),
          ...((!input.model) && { model: ["Model is required"] }),
          ...((!input.plateNumber) && { plateNumber: ["Plate number is required"] }),
          ...((!input.dailyRate) && { dailyRate: ["Daily rate is required"] }),
        },
      };
    }

    // Check plate uniqueness
    const existing = await prisma.vehicle.findUnique({
      where: { plateNumber: input.plateNumber.toUpperCase().trim() },
    });

    if (existing) {
      return {
        success: false,
        message: "A vehicle with this plate number already exists",
        errors: { plateNumber: ["Plate number must be unique"] },
      };
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        brand: input.brand.trim(),
        model: input.model.trim(),
        year: input.year,
        plateNumber: input.plateNumber.toUpperCase().trim(),
        color: input.color || "Black",
        transmission: input.transmission || "Automatic",
        fuelType: input.fuelType || "Gasoline",
        dailyRate: input.dailyRate,
        mileage: input.mileage || 0,
        status: input.status || "AVAILABLE",
        imageUrl: input.imageUrl || null,
        circulationDate: input.circulationDate ? new Date(input.circulationDate) : null,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
        registrationExpiry: input.registrationExpiry ? new Date(input.registrationExpiry) : null,
        notes: input.notes || null,
      },
    });

    revalidatePath("/vehicles");
    revalidatePath("/");

    return { success: true, message: "Vehicle added successfully", data: vehicle };
  } catch (error) {
    console.error("Create vehicle error:", error);
    return { success: false, message: "Failed to add vehicle" };
  }
}

// ─── Update Vehicle ──────────────────────────────────────────────
export async function updateVehicle(id: string, input: Partial<VehicleInput>): Promise<ActionResult> {
  try {
    // Check plate uniqueness if changing
    if (input.plateNumber) {
      const existing = await prisma.vehicle.findFirst({
        where: {
          plateNumber: input.plateNumber.toUpperCase().trim(),
          id: { not: id },
        },
      });
      if (existing) {
        return {
          success: false,
          message: "A vehicle with this plate number already exists",
        };
      }
    }

    const data: Record<string, unknown> = {};
    if (input.brand !== undefined) data.brand = input.brand.trim();
    if (input.model !== undefined) data.model = input.model.trim();
    if (input.year !== undefined) data.year = input.year;
    if (input.plateNumber !== undefined) data.plateNumber = input.plateNumber.toUpperCase().trim();
    if (input.color !== undefined) data.color = input.color;
    if (input.transmission !== undefined) data.transmission = input.transmission;
    if (input.fuelType !== undefined) data.fuelType = input.fuelType;
    if (input.dailyRate !== undefined) data.dailyRate = input.dailyRate;
    if (input.mileage !== undefined) data.mileage = input.mileage;
    if (input.status !== undefined) data.status = input.status;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl || null;
    if (input.circulationDate !== undefined) data.circulationDate = input.circulationDate ? new Date(input.circulationDate) : null;
    if (input.insuranceExpiry !== undefined) data.insuranceExpiry = input.insuranceExpiry ? new Date(input.insuranceExpiry) : null;
    if (input.registrationExpiry !== undefined) data.registrationExpiry = input.registrationExpiry ? new Date(input.registrationExpiry) : null;
    if (input.notes !== undefined) data.notes = input.notes || null;

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data,
    });

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${id}`);
    revalidatePath("/");

    return { success: true, message: "Vehicle updated successfully", data: vehicle };
  } catch (error) {
    console.error("Update vehicle error:", error);
    return { success: false, message: "Failed to update vehicle" };
  }
}

// ─── Delete Vehicle ──────────────────────────────────────────────
export async function deleteVehicle(id: string): Promise<ActionResult> {
  try {
    // Check for active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        vehicleId: id,
        status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      },
    });

    if (activeBookings > 0) {
      return {
        success: false,
        message: "Cannot delete vehicle with active bookings",
      };
    }

    await prisma.vehicle.delete({ where: { id } });

    revalidatePath("/vehicles");
    revalidatePath("/");

    return { success: true, message: "Vehicle deleted successfully" };
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return { success: false, message: "Failed to delete vehicle" };
  }
}

// ─── Get Vehicle Stats ───────────────────────────────────────────
export async function getVehicleStats() {
  const [total, available, rented, maintenance] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { status: "RENTED" } }),
    prisma.vehicle.count({ where: { status: "MAINTENANCE" } }),
  ]);

  return { total, available, rented, maintenance };
}
