"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function HomePage() {
  const { user, isAuthenticated, validateToken } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const checkAndRedirect = async () => {
      // Validar token con el backend
      const isValid = await validateToken()
      
      if (isValid && isAuthenticated && user) {
        // Token válido, redirigir según rol
        const redirectPath = user.role === "admin" ? "/admin" : "/dashboard"
        router.push(redirectPath)
      } else {
        // Token inválido o no existe, ir a login
        router.push("/login")
      }
    }

    checkAndRedirect()
  }, [user, isAuthenticated, router, validateToken])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <h1 className="text-2xl font-bold text-foreground mt-4">Redirecting...</h1>
        <p className="text-muted-foreground mt-2">Please wait while we redirect you...</p>
      </div>
    </div>
  )
}
