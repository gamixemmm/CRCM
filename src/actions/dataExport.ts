"use server";

import { prisma } from "@/lib/prisma";
import { canPerform } from "@/lib/permissions";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { logAuditAction } from "@/lib/audit";

function safeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "company";
}

export async function extractCompanyData() {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["EXPORT_DATA"])) {
      return { success: false, message: "You do not have permission to extract company data." };
    }

    const companyId = session.companyId;
    const [
      company,
      admin,
      employeeAccounts,
      vehicles,
      customers,
      bookings,
      invoices,
      maintenance,
      expenses,
      technicalInspections,
      vignettePayments,
      insurancePayments,
      employees,
      employeeRoles,
      salaryPayments,
      globalSettings,
      auditLogs,
    ] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.companyAdmin.findUnique({
        where: { companyId },
        select: {
          id: true,
          companyId: true,
          name: true,
          email: true,
          preferredCurrency: true,
          preferredLanguage: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.employeeAccount.findMany({
        where: { companyId },
        select: {
          id: true,
          companyId: true,
          employeeId: true,
          name: true,
          email: true,
          preferredCurrency: true,
          preferredLanguage: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.vehicle.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
      prisma.customer.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
      prisma.booking.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
      prisma.invoice.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
      prisma.maintenance.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
      prisma.expense.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
      prisma.technicalInspection.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
      prisma.vignettePayment.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
      prisma.insurancePayment.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
      prisma.employee.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
      prisma.employeeRole.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
      prisma.employeeSalaryPayment.findMany({ where: { companyId }, orderBy: [{ year: "asc" }, { month: "asc" }] }),
      prisma.globalSettings.findMany({ where: { companyId } }),
      prisma.auditLog.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
    ]);

    if (!company) {
      return { success: false, message: "Company not found." };
    }

    const exportedAt = new Date().toISOString();
    const data = {
      metadata: {
        exportedAt,
        exportedBy: {
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
        },
        companyId,
        companyName: company.name,
        format: "crmss-company-export-v1",
      },
      company,
      accounts: {
        admin,
        employeeAccounts,
      },
      tables: {
        vehicles,
        customers,
        bookings,
        invoices,
        maintenance,
        expenses,
        technicalInspections,
        vignettePayments,
        insurancePayments,
        employees,
        employeeRoles,
        salaryPayments,
        globalSettings,
        auditLogs,
      },
    };

    await logAuditAction({
      actor: session,
      action: "EXPORT_COMPANY_DATA",
      entityType: "Company",
      entityId: companyId,
      message: `${session.name} exported company data`,
      metadata: { exportedAt },
    });

    return {
      success: true,
      message: "Company data extracted",
      filename: `${safeFilePart(company.name)}-data-${exportedAt.slice(0, 10)}.json`,
      content: JSON.stringify(data, null, 2),
    };
  } catch (error) {
    console.error("Failed to extract company data", error);
    return { success: false, message: "Failed to extract company data." };
  }
}
