import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCompanyAdminSession();
  if (!session) {
    return NextResponse.json({ results: [] });
  }
  const companyId = session.companyId;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const [vehicles, customers, bookings] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        companyId,
        OR: [
          { brand: { contains: query, mode: "insensitive" } },
          { model: { contains: query, mode: "insensitive" } },
          { plateNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        brand: true,
        model: true,
        plateNumber: true,
        status: true,
      },
    }),
    prisma.customer.findMany({
      where: {
        companyId,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        companyId,
        OR: [
          { customer: { firstName: { contains: query, mode: "insensitive" } } },
          { customer: { lastName: { contains: query, mode: "insensitive" } } },
          { vehicle: { plateNumber: { contains: query, mode: "insensitive" } } },
          { vehicle: { brand: { contains: query, mode: "insensitive" } } },
          { vehicle: { model: { contains: query, mode: "insensitive" } } },
          { companyName: { contains: query, mode: "insensitive" } },
          { driverFirstName: { contains: query, mode: "insensitive" } },
          { driverLastName: { contains: query, mode: "insensitive" } },
          { driverCIN: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        customer: true,
        vehicle: true,
      },
    }),
  ]);

  const results = [
    ...vehicles.map((vehicle) => ({
      id: `vehicle-${vehicle.id}`,
      type: "Vehicle",
      title: `${vehicle.brand} ${vehicle.model}`,
      subtitle: `${vehicle.plateNumber} - ${vehicle.status}`,
      href: `/vehicles/${vehicle.id}`,
    })),
    ...customers.map((customer) => ({
      id: `customer-${customer.id}`,
      type: "Broker",
      title: `${customer.firstName} ${customer.lastName}`,
      subtitle: customer.phone || "Broker profile",
      href: `/customers/${customer.id}`,
    })),
    ...bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      type: "Booking",
      title: `${booking.vehicle.brand} ${booking.vehicle.model} - ${booking.vehicle.plateNumber}`,
      subtitle: `${booking.customer.firstName} ${booking.customer.lastName} - ${booking.status}`,
      href: `/bookings/${booking.id}`,
    })),
  ];

  return NextResponse.json({ results });
}
