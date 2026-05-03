import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { getBusinessDateParts } from "@/lib/businessTime";

function getCurrentPayrollPeriod() {
  const now = getBusinessDateParts();
  return {
    month: now.month + 1,
    year: now.year,
    day: now.day,
  };
}

export async function GET() {
  const session = await getCompanyAdminSession();
  if (!session || !canPerform(session, ["MANAGE_EMPLOYEES"])) {
    return NextResponse.json({ attentionCount: 0 });
  }

  const { month, year, day } = getCurrentPayrollPeriod();

  const employees = await prisma.employee.findMany({
    where: {
      companyId: session.companyId,
      active: true,
      hasSalary: true,
      payDay: { lte: day },
    },
    select: {
      id: true,
      salaryPayments: {
        where: { month, year },
        take: 1,
        select: { id: true },
      },
    },
  });

  const attentionCount = employees.filter((employee) => employee.salaryPayments.length === 0).length;

  return NextResponse.json({ attentionCount });
}
