import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date();
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const [
    vehicleCount,
    availableCount,
    rentedCount,
    maintenanceCount,
    activeBookings,
    totalCustomers,
    recentBookings,
    todayPickups,
    todayReturns,
    todayMaintenanceIn,
    todayMaintenanceOut,
    allInvoices,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { status: "RENTED" } }),
    prisma.vehicle.count({ where: { status: "MAINTENANCE" } }),
    prisma.booking.count({ where: { status: { in: ["ACTIVE", "CONFIRMED"] } } }),
    prisma.customer.count(),
    prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { customer: true, vehicle: true },
    }),
    prisma.booking.findMany({
      where: {
        startDate: {
          gte: todayStart,
          lt: tomorrowEnd,
        },
        status: { in: ["CONFIRMED", "ACTIVE"] },
      },
      include: { customer: true, vehicle: true },
    }),
    prisma.booking.findMany({
      where: {
        endDate: {
          gte: todayStart,
          lt: tomorrowEnd,
        },
        status: { in: ["ACTIVE", "COMPLETED", "CONFIRMED"] },
      },
      include: { customer: true, vehicle: true },
    }),
    prisma.maintenance.findMany({
      where: {
        serviceDate: {
          gte: todayStart,
          lt: tomorrowEnd,
        },
      },
      include: { vehicle: true },
    }),
    prisma.maintenance.findMany({
      where: {
        returnDate: {
          gte: todayStart,
          lt: tomorrowEnd,
        },
      },
      include: { vehicle: true },
    }),
    prisma.invoice.findMany(),
  ]);

  const overallRevenue = allInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.amountDue), 0);
  const pendingRevenue = allInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);

  return (
    <DashboardClient
      stats={{
        vehicleCount,
        availableCount,
        rentedCount,
        maintenanceCount,
        activeBookings,
        totalCustomers,
        overallRevenue,
        pendingRevenue,
      }}
      recentBookings={JSON.parse(JSON.stringify(recentBookings))}
      todayPickups={JSON.parse(JSON.stringify(todayPickups))}
      todayReturns={JSON.parse(JSON.stringify(todayReturns))}
      todayMaintenanceIn={JSON.parse(JSON.stringify(todayMaintenanceIn))}
      todayMaintenanceOut={JSON.parse(JSON.stringify(todayMaintenanceOut))}
    />
  );
}
