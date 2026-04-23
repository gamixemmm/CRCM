import { getExpenses } from "@/actions/expenses";
import { getVehicles } from "@/actions/vehicles";
import ExpensesClient from "./ExpensesClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const [expenses, vehicles, allInvoices] = await Promise.all([
    getExpenses(),
    getVehicles(),
    prisma.invoice.findMany(),
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
