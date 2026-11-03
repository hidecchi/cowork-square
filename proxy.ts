import { type NextRequest, NextResponse } from "next/server";
import { isIpAllowed } from "@/lib/ipAllowlist";

export function proxy(request: NextRequest) {
  if (
    process.env.RENDER === "true" &&
    request.nextUrl.pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  if (!isIpAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
