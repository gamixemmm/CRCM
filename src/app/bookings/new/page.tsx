import BookingForm from "../BookingForm";
import { getVehicles } from "@/actions/vehicles";
import { getCustomers } from "@/actions/customers";

export default async function NewBookingPage() {
  const [vehicles, customers] = await Promise.all([
    getVehicles({ status: "AVAILABLE" }),
    getCustomers(),
  ]);

  return <BookingForm vehicles={vehicles} customers={customers} />;
}
