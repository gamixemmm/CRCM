import { getBookings } from "@/actions/bookings";
import { getMaintenanceLogs } from "@/actions/maintenance";
import { getVehicles } from "@/actions/vehicles";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";
import BookingsClient from "./BookingsClient";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/bookings");
  }
  if (!canPerform(session, ["VIEW_BOOKINGS"])) redirect("/");
  const [bookings, vehicles, maintenanceLogs] = await Promise.all([
    getBookings(),
    getVehicles(),
    getMaintenanceLogs(),
  ]);
  return (
    <BookingsClient
      bookings={JSON.parse(JSON.stringify(bookings))}
      vehicles={JSON.parse(JSON.stringify(vehicles))}
      maintenanceLogs={JSON.parse(JSON.stringify(maintenanceLogs))}
    />
  );
}
