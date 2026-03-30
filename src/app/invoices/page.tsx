import { getInvoices } from "@/actions/invoices";
import InvoicesClient from "./InvoicesClient";

export default async function InvoicesPage() {
  const invoices = await getInvoices();
  return <InvoicesClient invoices={JSON.parse(JSON.stringify(invoices))} />;
}
