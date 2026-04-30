import { getExpenses } from "@/actions/expenses";
import { getVehicles } from "@/actions/vehicles";
import ExpensesClient from "./ExpensesClient";
import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/expenses");
  }
  if (!canPerform(session, ["VIEW_EXPENSES"])) redirect("/");
  const companyId = session.companyId;
  const [expenses, vehicles, allInvoices] = await Promise.all([
    getExpenses(),
    getVehicles(),
    prisma.invoice.findMany({ where: { companyId } }),
  ]);

  const overallRevenue = allInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.amountDue), 0);

  return (
    <ExpensesClient 
      expenses={JSON.parse(JSON.stringify(expenses))} 
      overallRevenue={overallRevenue}
      vehicles={JSON.parse(JSON.stringify(vehicles))}
    />
  );
}
