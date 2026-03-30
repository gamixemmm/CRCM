import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
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
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: "CONFIRMED",
      },
      include: { customer: true, vehicle: true },
    }),
    prisma.booking.findMany({
      where: {
        endDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: "ACTIVE",
      },
      include: { customer: true, vehicle: true },
    }),
    prisma.maintenance.findMany({
      where: {
        serviceDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: { vehicle: true },
    }),
    prisma.maintenance.findMany({
      where: {
        returnDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: { vehicle: true },
    }),
  ]);

  // Revenue this month
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const monthlyInvoices = await prisma.invoice.findMany({
    where: {
      createdAt: { gte: firstOfMonth },
      paymentStatus: { in: ["PAID", "PARTIAL"] },
    },
  });

  const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <DashboardClient
      stats={{
        vehicleCount,
        availableCount,
        rentedCount,
        maintenanceCount,
        activeBookings,
        totalCustomers,
        monthlyRevenue,
      }}
      recentBookings={JSON.parse(JSON.stringify(recentBookings))}
      todayPickups={JSON.parse(JSON.stringify(todayPickups))}
      todayReturns={JSON.parse(JSON.stringify(todayReturns))}
      todayMaintenanceIn={JSON.parse(JSON.stringify(todayMaintenanceIn))}
      todayMaintenanceOut={JSON.parse(JSON.stringify(todayMaintenanceOut))}
    />
  );
}
