"use client"

import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  const { isAuthenticated, user, redirectBasedOnRole } = useAuth()

  useEffect(() => {
    // If user is already authenticated, redirect immediately
    if (isAuthenticated && user) {
      redirectBasedOnRole(user.role)
    }
  }, [isAuthenticated, user, redirectBasedOnRole])

  // If authenticated, don't render login form (will redirect)
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Coolify Managment</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
