import { prisma } from "@/lib/prisma";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";
import TechnicalInspectionClient from "./TechnicalInspectionClient";

export const dynamic = "force-dynamic";

export default async function TechnicalInspectionPage() {
  const session = await getCompanyAdminSession();
  if (!session) {
    redirect("/login?next=/technical-inspection");
  }
  if (!canPerform(session, ["VIEW_TECHNICAL_INSPECTION"])) redirect("/");
  const companyId = session.companyId;
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId },
    orderBy: { plateNumber: "asc" },
    include: {
      technicalInspections: {
        orderBy: { inspectionDate: "desc" },
        take: 1,
      },
    },
  });

  return <TechnicalInspectionClient vehicles={JSON.parse(JSON.stringify(vehicles))} />;
}
