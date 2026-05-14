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
  const canViewExpenses = canPerform(session, ["VIEW_EXPENSES"]);
  const canViewFinancialTickers = canPerform(session, ["VIEW_DASHBOARD_FINANCIALS"]);
  if (!canViewExpenses && !canViewFinancialTickers) redirect("/");
  const companyId = session.companyId;
  const [expenses, vehicles, allInvoices, expenseSummary, globalSettings] = await Promise.all([
    canViewExpenses ? getExpenses() : Promise.resolve([]),
    canViewExpenses ? getVehicles() : Promise.resolve([]),
    prisma.invoice.findMany({ where: { companyId } }),
    prisma.expense.aggregate({
      where: { companyId },
      _sum: {
        amount: true,
      },
    }),
    getGlobalSettings(),
  ]);

  const overallRevenue = allInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.amountDue), 0);
  const cashRegister = globalSettings.cashRegister + overallRevenue;
  const totalCharges = expenseSummary._sum.amount ?? 0;

  return (
    <ExpensesClient 
      expenses={JSON.parse(JSON.stringify(expenses))} 
      overallRevenue={cashRegister}
      totalCharges={totalCharges}
      vehicles={JSON.parse(JSON.stringify(vehicles))}
      session={session}
    />
  );
}
