import { getInvoice } from "@/actions/invoices";
import { notFound } from "next/navigation";
import PrintableInvoice from "../PrintableInvoice";
import "../print.css";

export default async function InvoicePrintPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const invoice = await getInvoice(params.id);

  if (!invoice) {
    return notFound();
  }

  return <PrintableInvoice invoice={JSON.parse(JSON.stringify(invoice))} />;
}
