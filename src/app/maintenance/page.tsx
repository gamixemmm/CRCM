import { getMaintenanceLogs } from "@/actions/maintenance";
import MaintenanceClient from "./MaintenanceClient";

export default async function MaintenancePage() {
  const logs = await getMaintenanceLogs();
  return <MaintenanceClient logs={JSON.parse(JSON.stringify(logs))} />;
}
