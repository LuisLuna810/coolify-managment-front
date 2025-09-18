import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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
  
  // Simple cookie check (don't validate, just check existence)
  const token = request.cookies.get("token")?.value

  // Redirect to login if no token and accessing protected route
  if (!token && !isPublicRoute) {
    console.log(`[MIDDLEWARE] No token, redirecting ${pathname} to login`)
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Let the client-side handle all authentication logic
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
