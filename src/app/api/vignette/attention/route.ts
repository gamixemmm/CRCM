import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { getBusinessDateParts, getBusinessStartOfToday, zonedDateTimeToUtc } from "@/lib/businessTime";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getTargetVignetteYear(today: Date) {
  const { year } = getBusinessDateParts(today);
  const nextYearWindowStart = zonedDateTimeToUtc(year, 11, 30);
  return today >= startOfDay(nextYearWindowStart) ? year + 1 : year;
}

export async function GET() {
  const session = await getCompanyAdminSession();
  if (!session) {
    return NextResponse.json({ attentionCount: 0, targetYear: getBusinessDateParts().year, status: "not_due" });
  }
  const companyId = session.companyId;
  const today = getBusinessStartOfToday();
  const targetYear = getTargetVignetteYear(today);
  const paymentWindowStart = zonedDateTimeToUtc(targetYear - 1, 11, 30);

  if (today < paymentWindowStart) {
    return NextResponse.json({ attentionCount: 0, targetYear, status: "not_due" });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { companyId },
    select: { id: true },
  });

  const [payments, expenses] = await Promise.all([
    prisma.vignettePayment.findMany({
      where: { companyId, year: targetYear },
      select: { vehicleId: true },
    }),
    prisma.expense.findMany({
      where: {
        companyId,
        category: "Vignette",
        date: {
          gte: zonedDateTimeToUtc(targetYear, 0, 1),
          lt: zonedDateTimeToUtc(targetYear + 1, 0, 1),
        },
      },
      select: { vehicleId: true },
    }),
  ]);

  const paidVehicleIds = new Set<string>();
  payments.forEach((payment) => paidVehicleIds.add(payment.vehicleId));
  expenses.forEach((expense) => {
    if (expense.vehicleId) paidVehicleIds.add(expense.vehicleId);
  });

  const attentionCount = vehicles.filter((vehicle) => !paidVehicleIds.has(vehicle.id)).length;
  const overdueStart = zonedDateTimeToUtc(targetYear, 0, 31);

  return NextResponse.json({
    attentionCount,
    targetYear,
    status: today >= overdueStart ? "overdue" : "due",
  });
}
