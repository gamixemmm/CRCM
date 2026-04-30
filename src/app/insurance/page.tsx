import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";
import InsuranceClient from "./InsuranceClient";

export const dynamic = "force-dynamic";

export default async function InsurancePage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/insurance");
  }
  if (!canPerform(session, ["VIEW_INSURANCE"])) redirect("/");
  const companyId = session.companyId;
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId },
    orderBy: { plateNumber: "asc" },
    include: {
      insurancePayments: {
        orderBy: { paidAt: "desc" },
        take: 1,
      },
    },
  });

  return <InsuranceClient vehicles={JSON.parse(JSON.stringify(vehicles))} />;
}
