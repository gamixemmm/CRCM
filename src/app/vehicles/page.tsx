import { getVehicles, getVehicleStats } from "@/actions/vehicles";
import VehiclesClient from "./VehiclesClient";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const [vehicles, stats] = await Promise.all([
    getVehicles(),
    getVehicleStats(),
  ]);

  return <VehiclesClient vehicles={vehicles} stats={stats} />;
}
