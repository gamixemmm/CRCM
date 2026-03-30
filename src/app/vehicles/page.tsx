import { getVehicles, getVehicleStats } from "@/actions/vehicles";
import VehiclesClient from "./VehiclesClient";

export default async function VehiclesPage() {
  const [vehicles, stats] = await Promise.all([
    getVehicles(),
    getVehicleStats(),
  ]);

  return <VehiclesClient vehicles={vehicles} stats={stats} />;
}
