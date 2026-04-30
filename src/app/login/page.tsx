import { redirect } from "next/navigation";
import CompanyAdminLogin from "@/components/auth/CompanyAdminLogin";
import { getCompanyAdminSession } from "@/actions/companyAuth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/";
  const session = await getCompanyAdminSession();

  if (session) {
    redirect(nextPath);
  }

  return (
    <CompanyAdminLogin
      redirectTo={nextPath}
    />
  );
}
