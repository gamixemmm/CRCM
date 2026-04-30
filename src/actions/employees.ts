"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { requireCompanyId } from "@/lib/company";
import { canPerform } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit";

interface EmployeeInput {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  role?: string;
  hasSalary: boolean;
  salary?: number;
  payDay?: number;
  active?: boolean;
  notes?: string;
}

function getCurrentPayrollPeriod() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    day: now.getDate(),
  };
}

function getEmployeeName(employee: { firstName: string; lastName: string }) {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

export async function getEmployees() {
  const session = await requireCompanyAdminAccess();
  if (!canPerform(session, ["VIEW_EMPLOYEES"])) {
    return { employees: [], dueEmployees: [], month: getCurrentPayrollPeriod().month, year: getCurrentPayrollPeriod().year };
  }
  const companyId = await requireCompanyId();
  const { month, year, day } = getCurrentPayrollPeriod();

  const employees = await prisma.employee.findMany({
    where: { companyId },
    orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }],
    include: {
      account: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      salaryPayments: {
        where: { month, year },
        take: 1,
      },
    },
  });

  const dueEmployees = employees.filter(
    (employee) => employee.active && employee.hasSalary && employee.payDay !== null && employee.payDay <= day && employee.salaryPayments.length === 0
  );

  return { employees, dueEmployees, month, year };
}

export async function createEmployee(input: EmployeeInput) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["ADD_EMPLOYEES"])) return { success: false, message: "You do not have permission to add employees." };
    const companyId = await requireCompanyId();
    if (!input.firstName.trim() || !input.lastName.trim()) {
      return { success: false, message: "Employee name is required" };
    }

    if (input.hasSalary) {
      if (!Number.isFinite(input.salary) || !input.salary || input.salary <= 0) {
        return { success: false, message: "Salary must be greater than zero" };
      }

      if (!Number.isInteger(input.payDay) || !input.payDay || input.payDay < 1 || input.payDay > 31) {
        return { success: false, message: "Pay day must be between 1 and 31" };
      }
    }

    const employee = await prisma.employee.create({
      data: {
        companyId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        role: input.role?.trim() || null,
        hasSalary: input.hasSalary,
        salary: input.hasSalary ? input.salary : null,
        payDay: input.hasSalary ? input.payDay : null,
        active: input.active ?? true,
        notes: input.notes?.trim() || null,
      },
    });

    revalidatePath("/employees");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "CREATE_EMPLOYEE",
      entityType: "Employee",
      entityId: employee.id,
      message: `${session.name} created employee ${getEmployeeName(employee)}`,
    });
    return { success: true, message: "Employee added", data: employee };
  } catch (error) {
    console.error("Failed to create employee", error);
    return { success: false, message: "Failed to create employee" };
  }
}

export async function updateEmployee(id: string, input: EmployeeInput) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_EMPLOYEES"])) return { success: false, message: "You do not have permission to manage employees." };
    if (!input.firstName.trim() || !input.lastName.trim()) {
      return { success: false, message: "Employee name is required" };
    }

    if (input.hasSalary) {
      if (!Number.isFinite(input.salary) || !input.salary || input.salary <= 0) {
        return { success: false, message: "Salary must be greater than zero" };
      }

      if (!Number.isInteger(input.payDay) || !input.payDay || input.payDay < 1 || input.payDay > 31) {
        return { success: false, message: "Pay day must be between 1 and 31" };
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        role: input.role?.trim() || null,
        hasSalary: input.hasSalary,
        salary: input.hasSalary ? input.salary : null,
        payDay: input.hasSalary ? input.payDay : null,
        active: input.active ?? true,
        notes: input.notes?.trim() || null,
      },
    });

    revalidatePath("/employees");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "UPDATE_EMPLOYEE",
      entityType: "Employee",
      entityId: employee.id,
      message: `${session.name} updated employee ${getEmployeeName(employee)}`,
    });
    return { success: true, message: "Employee updated", data: employee };
  } catch (error) {
    console.error("Failed to update employee", error);
    return { success: false, message: "Failed to update employee" };
  }
}

export async function deleteEmployee(id: string) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_EMPLOYEES"])) {
      return { success: false, message: "You do not have permission to manage employees." };
    }

    const companyId = await requireCompanyId();
    const employee = await prisma.employee.findFirst({
      where: { id, companyId },
      include: { account: true },
    });

    if (!employee) return { success: false, message: "Employee not found" };

    await prisma.$transaction(async (tx) => {
      if (employee.account) {
        await tx.employeeAccount.delete({ where: { id: employee.account.id } });
      }
      await tx.employee.delete({ where: { id } });
    });

    revalidatePath("/employees");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "DELETE_EMPLOYEE",
      entityType: "Employee",
      entityId: id,
      message: `${session.name} deleted employee ${getEmployeeName(employee)}`,
    });
    return { success: true, message: "Employee deleted" };
  } catch (error) {
    console.error("Failed to delete employee", error);
    return { success: false, message: "Failed to delete employee" };
  }
}

export async function confirmEmployeeSalary(employeeId: string, status: "PAID" | "NOT_PAID") {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_EMPLOYEES"])) {
      return { success: false, message: "You do not have permission to manage employees." };
    }
    const companyId = await requireCompanyId();
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) return { success: false, message: "Employee not found" };
    if (!employee.hasSalary || !employee.salary) {
      return { success: false, message: "This employee has no salary configured" };
    }

    const { month, year } = getCurrentPayrollPeriod();
    const salary = employee.salary;

    const result = await prisma.$transaction(async (tx) => {
      let expenseId: string | null = null;
      const paidAt = status === "PAID" ? new Date() : null;

      if (status === "PAID") {
        const expense = await tx.expense.create({
          data: {
            companyId,
            date: paidAt!,
            category: "Salaire",
            amount: salary,
            description: `Paiement salaire - ${getEmployeeName(employee)} - ${month}/${year}`,
          },
        });
        expenseId = expense.id;
      }

      return tx.employeeSalaryPayment.upsert({
        where: {
          companyId_employeeId_month_year: {
            companyId,
            employeeId,
            month,
            year,
          },
        },
        update: {
          amount: salary,
          status,
          paidAt,
          expenseId,
        },
        create: {
          companyId,
          employeeId,
          month,
          year,
          amount: salary,
          status,
          paidAt,
          expenseId,
        },
      });
    });

    revalidatePath("/employees");
    revalidatePath("/expenses");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: status === "PAID" ? "PAY_SALARY" : "MARK_SALARY_UNPAID",
      entityType: "EmployeeSalaryPayment",
      entityId: result.id,
      message: `${session.name} ${status === "PAID" ? "confirmed salary payment for" : "marked salary unpaid for"} ${getEmployeeName(employee)}`,
      metadata: { employeeId, amount: salary, month, year, expenseId: result.expenseId },
    });
    return { success: true, message: status === "PAID" ? "Salary marked paid" : "Salary marked unpaid", data: result };
  } catch (error) {
    console.error("Failed to confirm salary", error);
    return { success: false, message: "Failed to confirm salary" };
  }
}

export async function getEmployeeRoles() {
  const companyId = await requireCompanyId();
  return prisma.employeeRole.findMany({ where: { companyId }, orderBy: { name: "asc" } });
}

export async function createEmployeeRole(name: string, permissions: string[] = []) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["ADD_ROLES"])) return { success: false, message: "You do not have permission to add roles." };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: "Role name is required" };

    const companyId = await requireCompanyId();
    const role = await prisma.employeeRole.create({
      data: {
        name: trimmed,
        permissions,
        company: {
          connect: { id: companyId },
        },
      },
    });
    revalidatePath("/settings");
    revalidatePath("/employees");
    await logAuditAction({
      actor: session,
      action: "CREATE_EMPLOYEE_ROLE",
      entityType: "EmployeeRole",
      entityId: role.id,
      message: `${session.name} created employee role ${trimmed}`,
      metadata: { permissions },
    });
    return { success: true, message: "Role added", data: role };
  } catch (error) {
    console.error("Failed to create employee role", error);
    return { success: false, message: "Failed to create employee role" };
  }
}

export async function updateEmployeeRole(id: string, name: string, permissions: string[] = []) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_ROLES"])) return { success: false, message: "You do not have permission to manage roles." };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: "Role name is required" };

    const companyId = await requireCompanyId();
    const current = await prisma.employeeRole.findFirst({ where: { id, companyId } });
    if (!current) return { success: false, message: "Role not found" };
    const role = await prisma.employeeRole.update({ where: { id }, data: { name: trimmed, permissions } });
    revalidatePath("/settings");
    revalidatePath("/employees");
    await logAuditAction({
      actor: session,
      action: "UPDATE_EMPLOYEE_ROLE",
      entityType: "EmployeeRole",
      entityId: role.id,
      message: `${session.name} updated employee role ${trimmed}`,
      metadata: { permissions },
    });
    return { success: true, message: "Role updated", data: role };
  } catch (error) {
    console.error("Failed to update employee role", error);
    return { success: false, message: "Failed to update employee role" };
  }
}

export async function deleteEmployeeRole(id: string) {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_ROLES"])) return { success: false, message: "You do not have permission to manage roles." };

    const companyId = await requireCompanyId();
    const current = await prisma.employeeRole.findFirst({ where: { id, companyId } });
    if (!current) return { success: false, message: "Role not found" };

    await prisma.$transaction([
      prisma.employee.updateMany({
        where: { companyId, role: current.name },
        data: { role: null },
      }),
      prisma.employeeRole.delete({ where: { id } }),
    ]);

    revalidatePath("/settings");
    revalidatePath("/employees");
    await logAuditAction({
      actor: session,
      action: "DELETE_EMPLOYEE_ROLE",
      entityType: "EmployeeRole",
      entityId: id,
      message: `${session.name} deleted employee role ${current.name}`,
    });
    return { success: true, message: "Role deleted" };
  } catch (error) {
    console.error("Failed to delete employee role", error);
    return { success: false, message: "Failed to delete employee role" };
  }
}
