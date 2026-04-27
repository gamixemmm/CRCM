import SettingsClient from "./SettingsClient";
import { getEmployeeRoles } from "@/actions/employees";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const roles = await getEmployeeRoles();

  return <SettingsClient employeeRoles={JSON.parse(JSON.stringify(roles))} />;
}
