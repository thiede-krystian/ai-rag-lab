import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getBasicAuthConfig,
  isBasicAuthAuthorized,
  shouldBypassBasicAuthPath,
} from "@/lib/basic-auth";

let loggedMissingBasicAuthConfig = false;

export function proxy(request: NextRequest) {
  if (shouldBypassBasicAuthPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const authConfig = getBasicAuthConfig();

  if (!authConfig.enabled) {
    return NextResponse.next();
  }

  if (!authConfig.isConfigured && !loggedMissingBasicAuthConfig) {
    loggedMissingBasicAuthConfig = true;
    console.error(
      "APP_BASIC_AUTH_ENABLED is true, but APP_BASIC_AUTH_USER or APP_BASIC_AUTH_PASSWORD is missing.",
    );
  }

  if (isBasicAuthAuthorized(request.headers.get("authorization"), authConfig)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="AI RAG Lab", charset="UTF-8"',
    },
    status: 401,
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:css|gif|ico|jpeg|jpg|js|json|map|otf|png|svg|ttf|txt|webp|woff|woff2|xml)$).*)",
  ],
};
