import MaintenanceForm from "../MaintenanceForm";
import { getMaintenanceServiceProviders } from "@/actions/maintenance";
import { getVehiclesForMaintenance } from "@/actions/vehicles";

export default async function NewMaintenancePage() {
  const [vehicles, serviceProviders] = await Promise.all([
    getVehiclesForMaintenance(),
    getMaintenanceServiceProviders(),
  ]);

  return (
    <MaintenanceForm
      vehicles={JSON.parse(JSON.stringify(vehicles))}
      serviceProviders={serviceProviders}
    />
  );
}
