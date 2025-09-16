"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter, usePathname } from "next/navigation"
import { ROUTES } from "@/lib/constants"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Wait a moment for the auth store to hydrate from localStorage
    const timer = setTimeout(() => {
      setIsInitialized(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isInitialized) return

    // Public routes that don't require authentication
    const publicRoutes = [ROUTES.LOGIN]
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    // If not authenticated and trying to access protected route
    if (!isAuthenticated && !isPublicRoute) {
      router.push(ROUTES.LOGIN)
      return
    }

    // If authenticated and on login page, redirect based on role
    if (isAuthenticated && pathname === ROUTES.LOGIN && user) {
      const redirectPath = user.role === "admin" ? ROUTES.ADMIN : ROUTES.DASHBOARD
      router.push(redirectPath)
      return
    }

    // Role-based route protection
    if (isAuthenticated && user) {
      if (pathname.startsWith("/admin") && user.role !== "admin") {
        router.push(ROUTES.DASHBOARD)
        return
      }
      
      if (pathname.startsWith("/dashboard") && user.role !== "developer") {
        router.push(ROUTES.ADMIN)
        return
      }
    }
  }, [isAuthenticated, user, pathname, router, isInitialized])

  // Don't render anything until initialized
  if (!isInitialized) {
    return null
  }

  return <>{children}</>
}