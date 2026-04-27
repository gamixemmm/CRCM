import { getEmployeeRoles, getEmployees } from "@/actions/employees";
import EmployeesClient from "./EmployeesClient";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const [data, roles] = await Promise.all([getEmployees(), getEmployeeRoles()]);

  return (
    <EmployeesClient
      employees={JSON.parse(JSON.stringify(data.employees))}
      dueEmployees={JSON.parse(JSON.stringify(data.dueEmployees))}
      roles={JSON.parse(JSON.stringify(roles))}
      month={data.month}
      year={data.year}
    />
  );
}
