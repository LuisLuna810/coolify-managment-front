"use client"

import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"

export default function HomePage() {
  const { isAuthenticated, user, redirectBasedOnRole } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user) {
      redirectBasedOnRole(user.role)
    } else {
      window.location.href = "/login"
    }
  }, [isAuthenticated, user, redirectBasedOnRole])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Loading...</h1>
        <p className="text-muted-foreground">Redirecting to your dashboard</p>
      </div>
    </div>
  )
}
