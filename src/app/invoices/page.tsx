import { getInvoices } from "@/actions/invoices";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";
import InvoicesClient from "./InvoicesClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/invoices");
  }
  const canViewAllInvoices = canPerform(session, ["VIEW_ALL_INVOICES"]);
  const canViewUnpaidInvoices = canPerform(session, ["VIEW_UNPAID_INVOICES"]);
  if (!canViewAllInvoices && !canViewUnpaidInvoices) redirect("/");
  const invoices = await getInvoices({ status: canViewAllInvoices ? "ALL" : "UNPAID" });
  return (
    <Suspense fallback={<div>Loading invoices...</div>}>
      <InvoicesClient
        invoices={JSON.parse(JSON.stringify(invoices))}
        canViewAllInvoices={canViewAllInvoices}
        canPayInvoices={canPerform(session, ["PAY_INVOICES"])}
        canCancelInvoices={canPerform(session, ["CANCEL_INVOICES"])}
      />
    </Suspense>
  );
}
