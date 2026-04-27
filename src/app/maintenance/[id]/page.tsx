import { notFound } from "next/navigation";
import { getMaintenanceLog } from "@/actions/maintenance";
import MaintenanceDetailClient from "./MaintenanceDetailClient";

export const dynamic = "force-dynamic";

export default async function MaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const log = await getMaintenanceLog(id);

  if (!log) notFound();

  return <MaintenanceDetailClient log={JSON.parse(JSON.stringify(log))} />;
}
