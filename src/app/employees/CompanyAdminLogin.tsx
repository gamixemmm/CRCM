import CompanyAdminLogin from "@/components/auth/CompanyAdminLogin";

export default function EmployeesCompanyAdminLogin() {
  return (
    <CompanyAdminLogin
      description="Only the selected company's admin account can access the employee system."
      buttonLabel="Unlock Employees"
    />
  );
}
