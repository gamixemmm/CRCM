import { getMaintenanceLogs } from "@/actions/maintenance";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";
import MaintenanceClient from "./MaintenanceClient";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/maintenance");
  }
  if (!canPerform(session, ["VIEW_MAINTENANCE"])) redirect("/");
  const logs = await getMaintenanceLogs();
  return <MaintenanceClient logs={JSON.parse(JSON.stringify(logs))} />;
}
