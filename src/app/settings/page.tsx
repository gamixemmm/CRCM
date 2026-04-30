import SettingsClient from "./SettingsClient";
import { getEmployeeRoles } from "@/actions/employees";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/settings");
  }
  const roles = await getEmployeeRoles();

  return <SettingsClient employeeRoles={JSON.parse(JSON.stringify(roles))} session={session} />;
}
