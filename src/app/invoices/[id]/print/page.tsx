import { getInvoice } from "@/actions/invoices";
import { notFound, redirect } from "next/navigation";
import PrintableInvoice from "../PrintableInvoice";
import "../print.css";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPage(props: { params: Promise<{ id: string }> }) {
  const session = await getCompanyAdminSession();
  if (!session) redirect("/login?next=/invoices");

  const params = await props.params;
  const invoice = await getInvoice(params.id);

  if (!invoice) {
    return notFound();
  }

  const canViewAllInvoices = canPerform(session, ["VIEW_ALL_INVOICES"]);
  const canViewUnpaidInvoices = canPerform(session, ["VIEW_UNPAID_INVOICES"]);
  const isUnpaidInvoice = invoice.paymentStatus === "PENDING" || invoice.paymentStatus === "PARTIAL";
  if (!canViewAllInvoices && (!canViewUnpaidInvoices || !isUnpaidInvoice)) redirect("/invoices");

  return <PrintableInvoice invoice={JSON.parse(JSON.stringify(invoice))} />;
}
