import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getTargetVignetteYear(today: Date) {
  const year = today.getFullYear();
  const nextYearWindowStart = new Date(year, 11, 30);
  return today >= startOfDay(nextYearWindowStart) ? year + 1 : year;
}

export async function GET() {
  const session = await getCompanyAdminSession();
  if (!session) {
    return NextResponse.json({ attentionCount: 0, targetYear: new Date().getFullYear(), status: "not_due" });
  }
  const companyId = session.companyId;
  const today = startOfDay(new Date());
  const targetYear = getTargetVignetteYear(today);
  const paymentWindowStart = startOfDay(new Date(targetYear - 1, 11, 30));

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
          gte: new Date(`${targetYear}-01-01T00:00:00.000Z`),
          lte: new Date(`${targetYear}-12-31T23:59:59.999Z`),
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
  const overdueStart = startOfDay(new Date(targetYear, 0, 31));

  return NextResponse.json({
    attentionCount,
    targetYear,
    status: today >= overdueStart ? "overdue" : "due",
  });
}
