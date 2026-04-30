import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/");
  }
  const companyId = session.companyId;

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
    expenseSummary,
  ] = await Promise.all([
    prisma.vehicle.count({ where: { companyId } }),
    prisma.vehicle.count({ where: { companyId, status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { companyId, status: "RENTED" } }),
    prisma.vehicle.count({ where: { companyId, status: "MAINTENANCE" } }),
    prisma.booking.count({ where: { companyId, status: { in: ["ACTIVE", "CONFIRMED"] } } }),
    prisma.customer.count({ where: { companyId } }),
    prisma.booking.findMany({
      where: { companyId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { customer: true, vehicle: true },
    }),
    prisma.booking.findMany({
      where: {
        companyId,
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
        companyId,
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
        companyId,
        serviceDate: {
          gte: todayStart,
          lt: tomorrowEnd,
        },
      },
      include: { vehicle: true },
    }),
    prisma.maintenance.findMany({
      where: {
        companyId,
        returnDate: {
          gte: todayStart,
          lt: tomorrowEnd,
        },
      },
      include: { vehicle: true },
    }),
    prisma.invoice.findMany({ where: { companyId } }),
    prisma.expense.aggregate({
      where: { companyId },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const overallRevenue = allInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.amountDue), 0);
  const pendingRevenue = allInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);
  const totalCharges = expenseSummary._sum.amount ?? 0;
  const remainder = overallRevenue - totalCharges;

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
        remainder,
      }}
      session={session}
      recentBookings={JSON.parse(JSON.stringify(recentBookings))}
      todayPickups={JSON.parse(JSON.stringify(todayPickups))}
      todayReturns={JSON.parse(JSON.stringify(todayReturns))}
      todayMaintenanceIn={JSON.parse(JSON.stringify(todayMaintenanceIn))}
      todayMaintenanceOut={JSON.parse(JSON.stringify(todayMaintenanceOut))}
    />
  );
}
