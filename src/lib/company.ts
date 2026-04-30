import { getCompanyAdminSession } from "@/actions/companyAuth";

export async function requireCompanySession() {
  const session = await getCompanyAdminSession();
  if (!session) {
    throw new Error("Company admin access is required");
  }
  return session;
}

export async function requireCompanyId() {
  const session = await requireCompanySession();
  return session.companyId;
}
