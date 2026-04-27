import { notFound } from "next/navigation";
import { getExpense } from "@/actions/expenses";
import { getVehicles } from "@/actions/vehicles";
import ExpenseDetailClient from "./ExpenseDetailClient";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [expense, vehicles] = await Promise.all([getExpense(id), getVehicles()]);

  if (!expense) notFound();

  return (
    <ExpenseDetailClient
      expense={JSON.parse(JSON.stringify(expense))}
      vehicles={JSON.parse(JSON.stringify(vehicles))}
    />
  );
}
