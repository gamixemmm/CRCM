import { getExpenses, getGlobalSettings } from "@/actions/expenses";
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
  const [expenses, vehicles, allInvoices, globalSettings] = await Promise.all([
    getExpenses(),
    getVehicles(),
    prisma.invoice.findMany({ where: { companyId } }),
    getGlobalSettings(),
  ]);

  const overallRevenue = allInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.amountDue), 0);
  const cashRegister = globalSettings.cashRegister + overallRevenue;

  return (
    <ExpensesClient 
      expenses={JSON.parse(JSON.stringify(expenses))} 
      overallRevenue={cashRegister}
      vehicles={JSON.parse(JSON.stringify(vehicles))}
    />
  );
}
