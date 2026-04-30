import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";
import VignetteClient from "./VignetteClient";

export const dynamic = "force-dynamic";

export default async function VignettePage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/vignette");
  }
  if (!canPerform(session, ["VIEW_VIGNETTE"])) redirect("/");
  const companyId = session.companyId;
  const currentYear = new Date().getFullYear();
  
  const [vehicles, vignetteExpenses, vignettePayments] = await Promise.all([
    prisma.vehicle.findMany({
      where: { companyId },
      orderBy: { plateNumber: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        companyId,
        category: "Vignette",
      },
      orderBy: { date: "desc" },
    }),
    prisma.vignettePayment.findMany({
      where: { companyId },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  return (
    <VignetteClient 
      vehicles={vehicles} 
      vignetteExpenses={vignetteExpenses} 
      vignettePayments={vignettePayments}
      currentYear={currentYear} 
    />
  );
}
