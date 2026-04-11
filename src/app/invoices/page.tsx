import { getInvoices } from "@/actions/invoices";
import InvoicesClient from "./InvoicesClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await getInvoices();
  return (
    <Suspense fallback={<div>Loading invoices...</div>}>
      <InvoicesClient invoices={JSON.parse(JSON.stringify(invoices))} />
    </Suspense>
  );
}
