import MaintenanceForm from "../MaintenanceForm";
import { getVehicles } from "@/actions/vehicles";

export default async function NewMaintenancePage() {
  // We allow fetching any vehicle that isn't already in Maintenance for logging.
  // Although technically, you can't put a RENTED car into maintenance either (handled by Form).
  const vehicles = await getVehicles();
  return <MaintenanceForm vehicles={JSON.parse(JSON.stringify(vehicles))} />;
}
