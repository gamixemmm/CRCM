import { getCustomers } from "@/actions/customers";
import CustomersClient from "./CustomersClient";

export default async function CustomersPage() {
  const customers = await getCustomers();
  return <CustomersClient customers={JSON.parse(JSON.stringify(customers))} />;
}
