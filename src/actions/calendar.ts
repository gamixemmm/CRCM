"use server";

import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/company";
import { getBusinessMonthRange } from "@/lib/businessTime";

function getCalendarDayIndex(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return Math.floor(copy.getTime() / 86_400_000);
}

function countOverlapDays(start: Date, end: Date, rangeStart: Date, rangeEnd: Date) {
  const startDay = Math.max(getCalendarDayIndex(start), getCalendarDayIndex(rangeStart));
  const endDay = Math.min(getCalendarDayIndex(end), getCalendarDayIndex(rangeEnd));
  return Math.max(0, endDay - startDay);
}

function getRentalDayCount(start: Date, end: Date) {
  return Math.max(1, getCalendarDayIndex(end) - getCalendarDayIndex(start));
}

export async function getCalendarEvents(year: number, month: number) {
  const companyId = await requireCompanyId();
  // We grab any event that overlaps with this month.
  // Actually, to keep it simple, grab all active/completed ones and filter/map them on frontend,
  // or grab a wider window. For an MVP, grabbing all recent/future jobs is fine.
  // Let's grab all bookings & maintenance that are not cancelled.
  
  const { start: startOfMonth, end: startOfNextMonth } = getBusinessMonthRange(year, month);

  const bookings = await prisma.booking.findMany({
    where: {
      companyId,
      status: { not: "CANCELLED" },
      OR: [
        { startDate: { lt: startOfNextMonth }, endDate: { gte: startOfMonth } }
      ]
    },
    include: { vehicle: true, customer: true }
  });

  const shopJobs = await prisma.maintenance.findMany({
    where: {
      companyId,
      OR: [
        { serviceDate: { lt: startOfNextMonth }, returnDate: { gte: startOfMonth } },
        { serviceDate: { lt: startOfNextMonth }, returnDate: null } // Still in shop
      ]
    },
    include: { vehicle: true }
  });

  const events = [];

  for (const b of bookings) {
    events.push({
      id: `booking-${b.id}`,
      originalId: b.id,
      title: `${b.vehicle.brand} ${b.vehicle.model}`,
      subtitle: `${b.customer.firstName} ${b.customer.lastName}`,
      startDate: b.startDate.toISOString(),
      endDate: b.endDate.toISOString(),
      type: "BOOKING",
      status: b.status,
      color: "var(--accent)",
      bg: "var(--accent-muted)",
    });
  }

  for (const m of shopJobs) {
    events.push({
      id: `shop-${m.id}`,
      originalId: m.id,
      title: `${m.vehicle.brand} ${m.vehicle.model}`,
      subtitle: m.description,
      startDate: m.serviceDate.toISOString(),
      endDate: m.returnDate ? m.returnDate.toISOString() : new Date().toISOString(), // Default to today if still in shop
      type: "MAINTENANCE",
      status: m.returnDate ? "COMPLETED" : "ACTIVE",
      color: "var(--warning)",
      bg: "var(--warning-muted)",
    });
  }

  return events;
}

export async function getVehicleMonthlyStats(year: number) {
  const companyId = await requireCompanyId();
  const yearStart = getBusinessMonthRange(year, 0).start;
  const yearEnd = getBusinessMonthRange(year, 11).end;

  const [vehicles, bookings, maintenance] = await Promise.all([
    prisma.vehicle.findMany({
      where: { companyId },
      orderBy: [{ brand: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
    }),
    prisma.booking.findMany({
      where: {
        companyId,
        status: { not: "CANCELLED" },
        startDate: { lt: yearEnd },
        endDate: { gte: yearStart },
      },
      include: { vehicle: true },
    }),
    prisma.maintenance.findMany({
      where: {
        companyId,
        serviceDate: { lt: yearEnd },
        OR: [
          { returnDate: { gte: yearStart } },
          { returnDate: null },
        ],
      },
      include: { vehicle: true },
    }),
  ]);

  const monthRanges = Array.from({ length: 12 }, (_, month) => ({
    month,
    label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(year, month, 1)),
    ...getBusinessMonthRange(year, month),
  }));

  const vehicleRows = vehicles.map((vehicle) => {
    const monthly = monthRanges.map((range) => {
      const vehicleBookings = bookings.filter((booking) => booking.vehicleId === vehicle.id);
      const vehicleMaintenance = maintenance.filter((job) => job.vehicleId === vehicle.id);

      let bookedDays = 0;
      let revenue = 0;
      let bookingCount = 0;

      for (const booking of vehicleBookings) {
        const overlapDays = countOverlapDays(booking.startDate, booking.endDate, range.start, range.end);
        if (overlapDays <= 0) continue;

        bookedDays += overlapDays;
        bookingCount += getCalendarDayIndex(booking.startDate) >= getCalendarDayIndex(range.start)
          && getCalendarDayIndex(booking.startDate) < getCalendarDayIndex(range.end)
          ? 1
          : 0;

        const totalDays = getRentalDayCount(booking.startDate, booking.endDate);
        revenue += (booking.totalAmount || 0) * (overlapDays / totalDays);
      }

      let stoppedDays = 0;
      for (const job of vehicleMaintenance) {
        const returnDate = job.returnDate || new Date();
        stoppedDays += countOverlapDays(job.serviceDate, returnDate, range.start, range.end);
      }

      return {
        month: range.month,
        label: range.label,
        bookedDays,
        stoppedDays,
        availableDays: Math.max(0, Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) - bookedDays - stoppedDays),
        bookingCount,
        revenue: Math.round(revenue),
      };
    });

    return {
      id: vehicle.id,
      label: `${vehicle.brand} ${vehicle.model}`,
      plateNumber: vehicle.plateNumber,
      status: vehicle.status,
      monthly,
      totals: monthly.reduce(
        (acc, month) => ({
          bookedDays: acc.bookedDays + month.bookedDays,
          stoppedDays: acc.stoppedDays + month.stoppedDays,
          availableDays: acc.availableDays + month.availableDays,
          bookingCount: acc.bookingCount + month.bookingCount,
          revenue: acc.revenue + month.revenue,
        }),
        { bookedDays: 0, stoppedDays: 0, availableDays: 0, bookingCount: 0, revenue: 0 }
      ),
    };
  });

  return {
    year,
    months: monthRanges.map((range) => ({ month: range.month, label: range.label })),
    vehicles: vehicleRows,
  };
}
