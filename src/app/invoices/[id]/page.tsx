import { getInvoice } from "@/actions/invoices";
import { notFound } from "next/navigation";
import InvoiceDetailClient from "./InvoiceDetailClient";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const invoice = await getInvoice(params.id);

  if (!invoice) {
    return notFound();
  }

  return <InvoiceDetailClient invoice={JSON.parse(JSON.stringify(invoice))} />;
}
