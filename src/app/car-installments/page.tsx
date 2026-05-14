import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";
import CarInstallmentsClient from "./CarInstallmentsClient";

export const dynamic = "force-dynamic";

export default async function CarInstallmentsPage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/car-installments");
  }
  if (!canPerform(session, ["VIEW_CAR_PAYMENTS"])) redirect("/");

  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: session.companyId },
    orderBy: { plateNumber: "asc" },
    include: {
      installmentPayment: true,
    },
  });

  return <CarInstallmentsClient vehicles={JSON.parse(JSON.stringify(vehicles))} canAddCarPayments={canPerform(session, ["ADD_CAR_PAYMENTS"])} />;
}
