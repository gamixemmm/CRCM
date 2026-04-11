import { getBookings } from "@/actions/bookings";
import BookingsClient from "./BookingsClient";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const bookings = await getBookings();
  return <BookingsClient bookings={JSON.parse(JSON.stringify(bookings))} />;
}
