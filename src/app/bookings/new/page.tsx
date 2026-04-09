import BookingForm from "../BookingForm";
import { getVehiclesWithBookings } from "@/actions/vehicles";
import { getCustomers } from "@/actions/customers";

export default async function NewBookingPage() {
  const [vehicles, customers] = await Promise.all([
    getVehiclesWithBookings(),
    getCustomers(),
  ]);

  return <BookingForm vehicles={vehicles} customers={customers} />;
}
