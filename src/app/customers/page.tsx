import { getCustomers } from "@/actions/customers";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";
import CustomersClient from "./CustomersClient";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/customers");
  }
  if (!canPerform(session, ["VIEW_BROKERS"])) redirect("/");
  const customers = await getCustomers();
  return <CustomersClient customers={JSON.parse(JSON.stringify(customers))} />;
}
