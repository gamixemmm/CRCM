import { getBooking } from "@/actions/bookings";
import { notFound } from "next/navigation";
import BookingDetailClient from "./BookingDetailClient";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const booking = await getBooking(params.id);
  
  if (!booking) {
    return notFound();
  }

  return <BookingDetailClient booking={JSON.parse(JSON.stringify(booking))} />;
}
