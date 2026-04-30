"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const developerCookieName = "crmss.developer_access";

function getDeveloperKey() {
  return process.env.DEVELOPER_ADMIN_KEY || "";
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function isDeveloperAuthenticated() {
  const key = getDeveloperKey();
  if (!key) return false;

  const cookieStore = await cookies();
  return cookieStore.get(developerCookieName)?.value === key;
}

async function requireDeveloperAccess() {
  const allowed = await isDeveloperAuthenticated();
  if (!allowed) {
    throw new Error("Unauthorized developer access");
  }
}

export async function developerLogin(input: { accessKey: string }) {
  const key = getDeveloperKey();
  if (!key) {
    return { success: false, message: "Developer admin key is not configured." };
  }

  if (input.accessKey !== key) {
    return { success: false, message: "Invalid developer access key." };
  }

  const cookieStore = await cookies();
  cookieStore.set(developerCookieName, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return { success: true, message: "Developer access granted." };
}

export async function developerLogout() {
  const cookieStore = await cookies();
  cookieStore.set(developerCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getDeveloperCompanies() {
  await requireDeveloperAccess();

  return prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      admin: {
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
    },
  });
}

export async function createDeveloperCompany(input: {
  name: string;
  slug?: string;
  contactEmail?: string;
  notes?: string;
}) {
  await requireDeveloperAccess();

  const name = input.name.trim();
  const slug = normalizeSlug(input.slug || input.name);

  if (!name) {
    return { success: false, message: "Company name is required." };
  }

  if (!slug) {
    return { success: false, message: "Company slug is required." };
  }

  const existing = await prisma.company.findUnique({ where: { slug } });
  if (existing) {
    return { success: false, message: "A company with this slug already exists." };
  }

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      contactEmail: input.contactEmail?.trim() || null,
      notes: input.notes?.trim() || null,
    },
    include: {
      admin: {
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
    },
  });

  revalidatePath("/developer");
  return { success: true, message: "Company added.", data: company };
}

export async function upsertDeveloperCompanyAdmin(input: {
  companyId: string;
  name: string;
  email: string;
  password?: string;
  active: boolean;
}) {
  await requireDeveloperAccess();

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password?.trim() || "";

  if (!name || !email) {
    return { success: false, message: "Admin name and email are required." };
  }

  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    include: { admin: true },
  });

  if (!company) {
    return { success: false, message: "Company not found." };
  }

  if (!company.admin && !password) {
    return { success: false, message: "Password is required when creating an admin account." };
  }

  const existingEmail = await prisma.companyAdmin.findUnique({ where: { email } });
  if (existingEmail && existingEmail.companyId !== input.companyId) {
    return { success: false, message: "This admin email is already used by another company." };
  }

  const passwordData = password ? { passwordHash: hashPassword(password) } : {};
  const admin = company.admin
    ? await prisma.companyAdmin.update({
        where: { companyId: input.companyId },
        data: {
          name,
          email,
          active: input.active,
          ...passwordData,
        },
      })
    : await prisma.companyAdmin.create({
        data: {
          companyId: input.companyId,
          name,
          email,
          active: input.active,
          passwordHash: hashPassword(password),
        },
      });

  revalidatePath("/developer");
  return { success: true, message: "Company admin account saved.", data: admin };
}

export async function setDeveloperCompanyAdminActive(companyId: string, active: boolean) {
  await requireDeveloperAccess();

  const admin = await prisma.companyAdmin.update({
    where: { companyId },
    data: { active },
  });

  revalidatePath("/developer");
  return {
    success: true,
    message: active ? "Company admin enabled." : "Company admin disabled.",
    data: admin,
  };
}

export async function setDeveloperCompanyActive(companyId: string, active: boolean) {
  await requireDeveloperAccess();

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      active,
      disabledAt: active ? null : new Date(),
    },
  });

  revalidatePath("/developer");
  return {
    success: true,
    message: active ? "Company enabled." : "Company disabled.",
    data: company,
  };
}
