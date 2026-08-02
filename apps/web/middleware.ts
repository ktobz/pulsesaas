import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/chat",
  "/payments",
  "/shorten",
  "/notifications",
  "/vector",
  "/rate-limits",
  "/infrastructure",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
    });
    if (!token) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/:path*",
    "/payments/:path*",
    "/shorten/:path*",
    "/notifications/:path*",
    "/vector/:path*",
    "/rate-limits/:path*",
    "/infrastructure/:path*",
  ],
};
