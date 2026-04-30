"use server";

import { prisma } from "@/lib/prisma";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";

export async function getAuditLogs() {
  const session = await requireCompanyAdminAccess();
  if (session.role !== "Administrator") {
    throw new Error("Administrator access is required");
  }

  return prisma.auditLog.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}
