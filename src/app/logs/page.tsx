import { redirect } from "next/navigation";
import { getCompanyAdminSession } from "@/actions/companyAuth";
import { getAuditLogs } from "@/actions/auditLogs";
import LogsClient from "./LogsClient";

export default async function LogsPage() {
  const session = await getCompanyAdminSession();
  if (!session) redirect("/login?next=/logs");
  if (session.role !== "Administrator") redirect("/");

  const logs = await getAuditLogs();
  return <LogsClient logs={JSON.parse(JSON.stringify(logs))} />;
}
