import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import * as jose from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "secretKey"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Static files (images, css, js, etc.)
  ) {
    return NextResponse.next()
  }

  const publicRoutes = ["/login"]
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  const token = request.cookies.get("token")?.value
  let role: string | null = null

  // Validate token if present
  if (token) {
    try {
      const decoded = await jose.jwtVerify(
        token,
        new TextEncoder().encode(JWT_SECRET)
      )
      role = decoded.payload.role as string
    } catch (error) {
      // Token is invalid, clear it and redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url))
      response.cookies.delete("token")
      return response
    }
  }

  // Redirect to login if no token and accessing protected route
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect authenticated users away from login page
  if (token && pathname === "/login") {
    const redirectPath = role === "admin" ? "/admin" : "/dashboard"
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  // Role-based access control
  if (token && role) {
    // Admin trying to access developer routes
    if (pathname.startsWith("/dashboard") && role !== "developer") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    
    // Developer trying to access admin routes
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any files with extensions (images, css, js, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
