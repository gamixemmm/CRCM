import MaintenanceForm from "../MaintenanceForm";
import { getVehiclesForMaintenance } from "@/actions/vehicles";

export default async function NewMaintenancePage() {
  const vehicles = await getVehiclesForMaintenance();
  return <MaintenanceForm vehicles={JSON.parse(JSON.stringify(vehicles))} />;
}
