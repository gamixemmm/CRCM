"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logAuditAction, type AuditActor } from "@/lib/audit";

const companyAdminCookieName = "crmss.company_admin";

export async function getCompanyAdminSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(companyAdminCookieName)?.value;
  if (!sessionId) return null;

  const admin = await prisma.companyAdmin.findUnique({
    where: { id: sessionId },
    include: { company: true },
  });

  if (admin && admin.active && admin.company.active) {
    return {
      id: admin.id,
      companyId: admin.companyId,
      companyName: admin.company.name,
      name: admin.name,
      email: admin.email,
      role: "Administrator",
      permissions: ["*"],
    };
  }

  const employeeAcct = await prisma.employeeAccount.findUnique({
    where: { id: sessionId },
    include: { company: true, employee: true },
  });

  if (employeeAcct && employeeAcct.active && employeeAcct.company.active) {
    let permissions: string[] = [];
    if (employeeAcct.employee?.role) {
      const roleDoc = await prisma.employeeRole.findUnique({
        where: {
          companyId_name: {
            companyId: employeeAcct.companyId,
            name: employeeAcct.employee.role,
          },
        },
      });
      if (roleDoc) {
        permissions = roleDoc.permissions || [];
      }
    }

    return {
      id: employeeAcct.id,
      companyId: employeeAcct.companyId,
      companyName: employeeAcct.company.name,
      name: employeeAcct.name,
      email: employeeAcct.email,
      role: employeeAcct.employee?.role || "Employee",
      permissions,
    };
  }

  return null;
}

export async function requireCompanyAdminAccess() {
  const session = await getCompanyAdminSession();
  if (!session) {
    throw new Error("Company admin access is required");
  }
  return session;
}

export async function companyAdminLogin(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  let accountId = null;
  let actor: AuditActor | null = null;

  const admin = await prisma.companyAdmin.findUnique({
    where: { email },
    include: { company: true },
  });

  if (admin && admin.active && admin.company.active && verifyPassword(password, admin.passwordHash)) {
    accountId = admin.id;
    actor = { id: admin.id, companyId: admin.companyId, name: admin.name, email: admin.email, role: "Administrator" };
    await prisma.companyAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
  } else {
    const employeeAcct = await prisma.employeeAccount.findUnique({
      where: { email },
      include: { company: true },
    });

    if (employeeAcct && employeeAcct.active && employeeAcct.company.active && verifyPassword(password, employeeAcct.passwordHash)) {
      accountId = employeeAcct.id;
      actor = { id: employeeAcct.id, companyId: employeeAcct.companyId, name: employeeAcct.name, email: employeeAcct.email, role: "Employee" };
      await prisma.employeeAccount.update({
        where: { id: employeeAcct.id },
        data: { lastLoginAt: new Date() },
      });
    }
  }

  if (!accountId) {
    return { success: false, message: "Invalid login credentials or inactive account." };
  }

  const cookieStore = await cookies();
  cookieStore.set(companyAdminCookieName, accountId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  await logAuditAction({
    actor,
    action: "LOGIN",
    entityType: "Account",
    entityId: accountId,
    message: `${actor?.name || actor?.email || "User"} logged in`,
  });

  return { success: true, message: "Access granted." };
}

export async function companyAdminLogout() {
  const session = await getCompanyAdminSession();
  const cookieStore = await cookies();
  cookieStore.set(companyAdminCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  await logAuditAction({
    actor: session,
    action: "LOGOUT",
    entityType: "Account",
    entityId: session?.id,
    message: `${session?.name || session?.email || "User"} logged out`,
  });
}

export async function upsertEmployeeAccount(input: {
  employeeId: string;
  name: string;
  email: string;
  password?: string;
  active: boolean;
}) {
  const session = await requireCompanyAdminAccess();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password?.trim() || "";

  if (!name || !email) {
    return { success: false, message: "Account name and email are required." };
  }

  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, companyId: session.companyId },
    include: { account: true },
  });

  if (!employee) {
    return { success: false, message: "Employee not found." };
  }

  if (!employee.account && !password) {
    return { success: false, message: "Password is required when creating an employee account." };
  }

  const existingEmail = await prisma.employeeAccount.findUnique({ where: { email } });
  if (existingEmail && existingEmail.employeeId !== input.employeeId) {
    return { success: false, message: "This email is already used by another employee account." };
  }

  const passwordData = password ? { passwordHash: hashPassword(password) } : {};
  const account = employee.account
    ? await prisma.employeeAccount.update({
        where: { employeeId: input.employeeId },
        data: { name, email, active: input.active, ...passwordData },
      })
    : await prisma.employeeAccount.create({
        data: {
          companyId: session.companyId,
          employeeId: input.employeeId,
          name,
          email,
          active: input.active,
          passwordHash: hashPassword(password),
        },
      });

  revalidatePath("/employees");
  await logAuditAction({
    actor: session,
    action: employee.account ? "UPDATE_EMPLOYEE_ACCOUNT" : "CREATE_EMPLOYEE_ACCOUNT",
    entityType: "EmployeeAccount",
    entityId: account.id,
    message: `${session.name} ${employee.account ? "updated" : "created"} employee login for ${name}`,
    metadata: { employeeId: input.employeeId, active: input.active },
  });
  return { success: true, message: "Employee account saved.", data: account };
}
