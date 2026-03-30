import { getCustomer } from "@/actions/customers";
import { notFound } from "next/navigation";
import CustomerDetailClient from "./CustomerDetailClient";

export default async function CustomerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const customer = await getCustomer(params.id);
  
  if (!customer) {
    return notFound();
  }

  return <CustomerDetailClient customer={JSON.parse(JSON.stringify(customer))} />;
}
