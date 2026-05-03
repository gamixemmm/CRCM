"use server";

import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/company";
import { getBusinessMonthRange } from "@/lib/businessTime";

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
