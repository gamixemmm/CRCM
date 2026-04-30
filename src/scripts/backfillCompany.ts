import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  let company = await prisma.company.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Default Company",
        slug: "default-company",
        notes: "Auto-created during tenant backfill",
      },
    });
  }

  const companyId = company.id;

  await Promise.all([
    prisma.vehicle.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.customer.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.booking.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.invoice.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.maintenance.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.expense.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.technicalInspection.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.vignettePayment.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.insurancePayment.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.employee.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.employeeRole.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.employeeSalaryPayment.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.globalSettings.updateMany({ where: { companyId: null }, data: { companyId } }),
  ]);

  console.log(`Backfilled tenant data to company ${company.name} (${companyId})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
