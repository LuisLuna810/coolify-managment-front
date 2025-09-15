import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import * as jose from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "secretKey"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const publicRoutes = ["/login"]
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  const token = request.cookies.get("token")?.value
  let role: string | null = null

  if (token) {
    try {
      const decoded = await jose.jwtVerify(
        token,
        new TextEncoder().encode(JWT_SECRET)
      )
      role = decoded.payload.role as string
    } catch {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/dashboard", request.url))
  }

  if (token) {
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    if (pathname.startsWith("/dashboard") && role !== "developer") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
