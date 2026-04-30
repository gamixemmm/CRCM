import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export async function GET() {
  const session = await getCompanyAdminSession();
  if (!session) {
    return NextResponse.json({ attentionCount: 0 });
  }
  const companyId = session.companyId;
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId },
    select: {
      id: true,
      insuranceExpiry: true,
    },
  });

  const payments = await prisma.insurancePayment.findMany({
    where: { companyId },
    orderBy: { paidAt: "desc" },
    select: {
      vehicleId: true,
      endDate: true,
    },
  });

  const latestByVehicle = new Map<string, Date>();
  payments.forEach((payment) => {
    if (!latestByVehicle.has(payment.vehicleId)) {
      latestByVehicle.set(payment.vehicleId, payment.endDate);
    }
  });

  const today = startOfDay(new Date());
  const attentionCount = vehicles.reduce((count, vehicle) => {
    const endDate = latestByVehicle.get(vehicle.id) ?? vehicle.insuranceExpiry;
    if (!endDate) return count;

    const end = startOfDay(endDate);
    const daysUntilEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilEnd <= 15 ? count + 1 : count;
  }, 0);

  return NextResponse.json({ attentionCount });
}
