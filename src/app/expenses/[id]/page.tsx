import { notFound } from "next/navigation";
import { getExpense } from "@/actions/expenses";
import { getVehicles } from "@/actions/vehicles";
import ExpenseDetailClient from "./ExpenseDetailClient";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/expenses");
  }
  if (!canPerform(session, ["VIEW_EXPENSES"])) redirect("/");

  const { id } = await params;
  const [expense, vehicles] = await Promise.all([getExpense(id), getVehicles()]);

  if (!expense) notFound();

  return (
    <ExpenseDetailClient
      expense={JSON.parse(JSON.stringify(expense))}
      vehicles={JSON.parse(JSON.stringify(vehicles))}
      canEditDeleteExpenses={canPerform(session, ["EDIT_DELETE_EXPENSES"])}
    />
  );
}
