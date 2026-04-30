import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

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
      circulationDate: true,
      technicalInspectionDueDate: true,
    },
  });

  const inspections = await prisma.technicalInspection.findMany({
    where: { companyId },
    orderBy: { inspectionDate: "desc" },
    select: {
      vehicleId: true,
      nextDueDate: true,
    },
  });

  const latestByVehicle = new Map<string, Date>();
  inspections.forEach((inspection) => {
    if (!latestByVehicle.has(inspection.vehicleId)) {
      latestByVehicle.set(inspection.vehicleId, inspection.nextDueDate);
    }
  });

  const today = startOfDay(new Date());
  const attentionCount = vehicles.reduce((count, vehicle) => {
    const dueDate = latestByVehicle.get(vehicle.id) ?? (
      vehicle.technicalInspectionDueDate
        ? vehicle.technicalInspectionDueDate
        : vehicle.circulationDate
          ? addYears(vehicle.circulationDate, 1)
          : null
    );

    if (!dueDate) return count;

    const due = startOfDay(dueDate);
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 10 ? count + 1 : count;
  }, 0);

  return NextResponse.json({ attentionCount });
}
