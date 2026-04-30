import { getEmployeeRoles, getEmployees } from "@/actions/employees";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import EmployeesClient from "./EmployeesClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/employees");
  }
  if (!canPerform(session, ["VIEW_EMPLOYEES"])) redirect("/");

  const [data, roles] = await Promise.all([getEmployees(), getEmployeeRoles()]);

  return (
    <EmployeesClient
      companyAdmin={session}
      employees={JSON.parse(JSON.stringify(data.employees))}
      dueEmployees={JSON.parse(JSON.stringify(data.dueEmployees))}
      roles={JSON.parse(JSON.stringify(roles))}
      month={data.month}
      year={data.year}
    />
  );
}
