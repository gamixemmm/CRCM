import { getExpenses, getGlobalSettings } from "@/actions/expenses";
import { getVehicles } from "@/actions/vehicles";
import ExpensesClient from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await getExpenses();
  const settings = await getGlobalSettings();
  const vehicles = await getVehicles();

  return (
    <ExpensesClient 
      expenses={JSON.parse(JSON.stringify(expenses))} 
      cashRegister={settings.cashRegister}
      vehicles={JSON.parse(JSON.stringify(vehicles))}
    />
  );
}
