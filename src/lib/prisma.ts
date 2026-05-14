import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion: string | undefined;
};

const PRISMA_SCHEMA_VERSION = "employee-permissions-2026-05-14";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

function isStalePrismaClient(client: PrismaClient | undefined) {
  return !!client && (
    globalForPrisma.prismaSchemaVersion !== PRISMA_SCHEMA_VERSION ||
    typeof (client as PrismaClient & { auditLog?: unknown }).auditLog === "undefined" ||
    typeof (client as PrismaClient & { carInstallmentPayment?: unknown }).carInstallmentPayment === "undefined"
  );
}

export const prisma =
  isStalePrismaClient(globalForPrisma.prisma)
    ? new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
      })
    : globalForPrisma.prisma ??
      new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}
