"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { usePathname } from "next/navigation"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuth()
  const pathname = usePathname()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Wait a moment for the auth store to hydrate from localStorage
    const timer = setTimeout(() => {
      setIsInitialized(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Don't render anything until initialized
  if (!isInitialized) {
    return null
  }

  // Let the middleware handle all redirections to avoid conflicts
  // The AuthGuard now only manages the loading state and rendering
  // All authentication and authorization logic is handled by middleware.ts
  
  return <>{children}</>
}