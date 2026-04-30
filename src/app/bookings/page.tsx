import { getBookings } from "@/actions/bookings";
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
  const bookings = await getBookings();
  return <BookingsClient bookings={JSON.parse(JSON.stringify(bookings))} />;
}
