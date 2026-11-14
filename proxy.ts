import { type NextRequest, NextResponse } from "next/server";

const APEX = "database.tech";

const stripSitePrefix = (pathname: string) => pathname.slice(5) || "/";

export const proxy = (request: NextRequest) => {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;
  const isSitePath = pathname === "/site" || pathname.startsWith("/site/");

  if (host === `www.${APEX}`) {
    return NextResponse.redirect(`https://${APEX}${pathname}${search}`, 308);
  }

  if (host === APEX) {
    if (isSitePath) {
      return NextResponse.redirect(
        `https://${APEX}${stripSitePrefix(pathname)}${search}`,
        308,
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = `/site${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (isSitePath && process.env.VERCEL_ENV === "production") {
    return NextResponse.redirect(
      `https://${APEX}${stripSitePrefix(pathname)}${search}`,
      308,
    );
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico|icon.svg).*)"],
};
