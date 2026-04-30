"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/company";
import { canPerform } from "@/lib/permissions";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { logAuditAction } from "@/lib/audit";

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
  const companyId = await requireCompanyId();
  const where: Record<string, unknown> = {};
  where.companyId = companyId;
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
  const companyId = await requireCompanyId();
  return prisma.customer.findFirst({
    where: { id, companyId },
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
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["ADD_BROKERS"])) {
      return { success: false, message: "You do not have permission to add brokers." };
    }
    const companyId = await requireCompanyId();
    if (!input.firstName || !input.lastName) {
      return { success: false, message: "First name and last name are required" };
    }

    if (input.licenseNumber) {
      const existing = await prisma.customer.findUnique({
        where: { companyId_licenseNumber: { companyId, licenseNumber: input.licenseNumber.trim() } },
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
        companyId,
        licenseNumber: input.licenseNumber?.trim() || null,
        licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });

    revalidatePath("/customers");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "CREATE_BROKER",
      entityType: "Customer",
      entityId: customer.id,
      message: `${session.name} created broker ${customer.firstName} ${customer.lastName}`,
    });

    return { success: true, message: "Customer added", data: customer };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create customer" };
  }
}
