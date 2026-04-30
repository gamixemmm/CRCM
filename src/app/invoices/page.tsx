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
  if (!canPerform(session, ["VIEW_INVOICES"])) redirect("/");
  const invoices = await getInvoices();
  return (
    <Suspense fallback={<div>Loading invoices...</div>}>
      <InvoicesClient invoices={JSON.parse(JSON.stringify(invoices))} />
    </Suspense>
  );
}
