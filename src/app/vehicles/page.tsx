import { getVehicles, getVehicleStats } from "@/actions/vehicles";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";
import VehiclesClient from "./VehiclesClient";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const session = await getCompanyAdminSession();
  if (!session) redirect("/login?next=/vehicles");
  if (!canPerform(session, ["VIEW_VEHICLES"])) redirect("/");
  const [vehicles, stats] = await Promise.all([
    getVehicles(),
    getVehicleStats(),
  ]);

  return <VehiclesClient vehicles={vehicles} stats={stats} />;
}
