"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function HomePage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Si ya está autenticado, redirigir según rol
    if (isAuthenticated && user) {
      const redirectPath = user.role === "admin" ? "/admin" : "/dashboard"
      router.push(redirectPath)
    } else {
      // Si no está autenticado, ir al login
      router.push("/login")
    }
  }, [isAuthenticated, user, router])

  // Mostrar loading mientras redirige
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
