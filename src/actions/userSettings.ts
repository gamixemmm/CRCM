"use server";

import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";

export type UserCurrencyCode = "MAD" | "EUR" | "USD";
export type UserLanguageCode = "en" | "fr" | "ar";

const currencies: UserCurrencyCode[] = ["MAD", "EUR", "USD"];
const languages: UserLanguageCode[] = ["en", "fr", "ar"];

function isCurrency(value: string): value is UserCurrencyCode {
  return currencies.includes(value as UserCurrencyCode);
}

function isLanguage(value: string): value is UserLanguageCode {
  return languages.includes(value as UserLanguageCode);
}

export async function getUserSettings() {
  const session = await getCompanyAdminSession();
  if (!session) return null;

  if (session.role === "Administrator") {
    const admin = await prisma.companyAdmin.findFirst({
      where: { id: session.id, companyId: session.companyId },
      select: { preferredCurrency: true, preferredLanguage: true },
    });

    if (!admin) return null;

    return {
      currency: isCurrency(admin.preferredCurrency) ? admin.preferredCurrency : "MAD",
      language: isLanguage(admin.preferredLanguage) ? admin.preferredLanguage : "en",
    };
  }

  const employeeAccount = await prisma.employeeAccount.findFirst({
    where: { id: session.id, companyId: session.companyId },
    select: { preferredCurrency: true, preferredLanguage: true },
  });

  if (!employeeAccount) return null;

  return {
    currency: isCurrency(employeeAccount.preferredCurrency) ? employeeAccount.preferredCurrency : "MAD",
    language: isLanguage(employeeAccount.preferredLanguage) ? employeeAccount.preferredLanguage : "en",
  };
}

export async function updateUserSettings(input: {
  currency?: UserCurrencyCode;
  language?: UserLanguageCode;
}) {
  const session = await getCompanyAdminSession();
  if (!session) return { success: false, message: "Login required." };

  const data: { preferredCurrency?: UserCurrencyCode; preferredLanguage?: UserLanguageCode } = {};

  if (input.currency && isCurrency(input.currency)) {
    data.preferredCurrency = input.currency;
  }

  if (input.language && isLanguage(input.language)) {
    data.preferredLanguage = input.language;
  }

  if (Object.keys(data).length === 0) {
    return { success: false, message: "No valid settings provided." };
  }

  if (session.role === "Administrator") {
    await prisma.companyAdmin.update({
      where: { id: session.id },
      data,
    });
  } else {
    await prisma.employeeAccount.update({
      where: { id: session.id },
      data,
    });
  }

  return { success: true };
}
