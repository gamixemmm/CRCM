import { getBookings } from "@/actions/bookings";
import BookingsClient from "./BookingsClient";

export default async function BookingsPage() {
  const bookings = await getBookings();
  return <BookingsClient bookings={JSON.parse(JSON.stringify(bookings))} />;
}
