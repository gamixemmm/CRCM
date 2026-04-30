import { isDeveloperAuthenticated, getDeveloperCompanies } from "@/actions/developer";
import DeveloperClient from "./DeveloperClient";

export const dynamic = "force-dynamic";

export default async function DeveloperPage() {
  const authenticated = await isDeveloperAuthenticated();
  const companies = authenticated ? await getDeveloperCompanies() : [];

  return (
    <DeveloperClient
      authenticated={authenticated}
      companies={JSON.parse(JSON.stringify(companies))}
    />
  );
}
