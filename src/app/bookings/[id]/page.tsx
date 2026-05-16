import { getBooking } from "@/actions/bookings";
import { notFound } from "next/navigation";
import BookingDetailClient from "./BookingDetailClient";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await getCompanyAdminSession();
  const params = await props.params;
  const booking = await getBooking(params.id);
  
  if (!booking) {
    return notFound();
  }

  return (
    <BookingDetailClient
      booking={JSON.parse(JSON.stringify(booking))}
      canPayInvoices={canPerform(session, ["PAY_INVOICES"])}
      canCancelInvoices={canPerform(session, ["CANCEL_INVOICES"])}
    />
  );
}
