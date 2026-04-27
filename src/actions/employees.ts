"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
  const { month, year, day } = getCurrentPayrollPeriod();

  const employees = await prisma.employee.findMany({
    orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }],
    include: {
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
    return { success: true, message: "Employee added", data: employee };
  } catch (error) {
    console.error("Failed to create employee", error);
    return { success: false, message: "Failed to create employee" };
  }
}

export async function updateEmployee(id: string, input: EmployeeInput) {
  try {
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
    return { success: true, message: "Employee updated", data: employee };
  } catch (error) {
    console.error("Failed to update employee", error);
    return { success: false, message: "Failed to update employee" };
  }
}

export async function confirmEmployeeSalary(employeeId: string, status: "PAID" | "NOT_PAID") {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
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
            date: paidAt!,
            category: "Salaire",
            amount: salary,
            description: `Salary payment - ${getEmployeeName(employee)} - ${month}/${year}`,
          },
        });
        expenseId = expense.id;
      }

      return tx.employeeSalaryPayment.upsert({
        where: {
          employeeId_month_year: {
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
    return { success: true, message: status === "PAID" ? "Salary marked paid" : "Salary marked unpaid", data: result };
  } catch (error) {
    console.error("Failed to confirm salary", error);
    return { success: false, message: "Failed to confirm salary" };
  }
}

export async function getEmployeeRoles() {
  return prisma.employeeRole.findMany({ orderBy: { name: "asc" } });
}

export async function createEmployeeRole(name: string) {
  try {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: "Role name is required" };

    const role = await prisma.employeeRole.create({ data: { name: trimmed } });
    revalidatePath("/settings");
    revalidatePath("/employees");
    return { success: true, message: "Role added", data: role };
  } catch (error) {
    console.error("Failed to create employee role", error);
    return { success: false, message: "Failed to create employee role" };
  }
}

export async function updateEmployeeRole(id: string, name: string) {
  try {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: "Role name is required" };

    const role = await prisma.employeeRole.update({ where: { id }, data: { name: trimmed } });
    revalidatePath("/settings");
    revalidatePath("/employees");
    return { success: true, message: "Role updated", data: role };
  } catch (error) {
    console.error("Failed to update employee role", error);
    return { success: false, message: "Failed to update employee role" };
  }
}
