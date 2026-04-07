"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface CustomerInput {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  address?: string;
  notes?: string;
}

export async function getCustomers(params?: { search?: string }) {
  const where: any = {};
  if (params?.search) {
    where.OR = [
      { firstName: { contains: params.search, mode: "insensitive" } },
      { lastName: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search } },
    ];
  }

  return prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { bookings: true },
      },
    },
  });
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: { startDate: "desc" },
        include: { vehicle: true },
        take: 10,
      },
    },
  });
}

export async function createCustomer(input: CustomerInput) {
  try {
    if (!input.firstName || !input.lastName) {
      return { success: false, message: "First name and last name are required" };
    }

    if (input.licenseNumber) {
      const existing = await prisma.customer.findUnique({
        where: { licenseNumber: input.licenseNumber.trim() },
      });
      if (existing) {
        return { success: false, message: "A broker with this license number already exists" };
      }
    }

    const customer = await prisma.customer.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        licenseNumber: input.licenseNumber?.trim() || null,
        licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });

    revalidatePath("/customers");
    revalidatePath("/");

    return { success: true, message: "Customer added", data: customer };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create customer" };
  }
}
