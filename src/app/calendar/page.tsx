import { getCompanyAdminSession } from "@/actions/companyAuth";
import { canPerform } from "@/lib/permissions";
import { redirect } from "next/navigation";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  const session = await getCompanyAdminSession();
  if (!session) redirect("/login?next=/calendar");
  if (!canPerform(session, ["VIEW_CALENDAR"])) redirect("/");
  return <CalendarClient />;
}
