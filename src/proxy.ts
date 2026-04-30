import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const companyAdminCookieName = "crmss.company_admin";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCompanySession = request.cookies.has(companyAdminCookieName);

  if (!hasCompanySession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/vehicles/:path*",
    "/bookings/:path*",
    "/calendar/:path*",
    "/customers/:path*",
    "/invoices/:path*",
    "/expenses/:path*",
    "/vignette/:path*",
    "/insurance/:path*",
    "/technical-inspection/:path*",
    "/employees/:path*",
    "/maintenance/:path*",
    "/settings/:path*",
  ],
};
